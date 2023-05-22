import { DirTypes } from './gridsterConfig.interface';
import { GridsterPush } from './gridsterPush.service';
import { GridsterPushResize } from './gridsterPushResize.service';
import { cancelScroll, scroll } from './gridsterScroll.service';
import { GridsterUtils } from './gridsterUtils.service';
export class GridsterResizable {
    constructor(gridsterItem, gridster, zone) {
        this.zone = zone;
        /**
         * The direction function may reference any of the `GridsterResizable` class methods, that are
         * responsible for gridster resize when the `dragmove` event is being handled. E.g. it may reference
         * the `handleNorth` method when the north handle is pressed and moved by a mouse.
         */
        this.directionFunction = null;
        this.dragMove = (e) => {
            if (this.directionFunction === null) {
                throw new Error('The `directionFunction` has not been set before calling `dragMove`.');
            }
            e.stopPropagation();
            e.preventDefault();
            GridsterUtils.checkTouchEvent(e);
            this.offsetTop = this.gridster.el.scrollTop - this.gridster.el.offsetTop;
            this.offsetLeft = this.gridster.el.scrollLeft - this.gridster.el.offsetLeft;
            scroll(this.gridster, this.left, this.top, this.width, this.height, e, this.lastMouse, this.directionFunction, true, this.resizeEventScrollType);
            const scale = this.gridster.options.scale || 1;
            this.directionFunction({
                clientX: this.originalClientX + (e.clientX - this.originalClientX) / scale,
                clientY: this.originalClientY + (e.clientY - this.originalClientY) / scale
            });
            this.lastMouse.clientX = e.clientX;
            this.lastMouse.clientY = e.clientY;
            this.zone.run(() => {
                this.gridster.updateGrid();
            });
        };
        this.dragStop = (e) => {
            e.stopPropagation();
            e.preventDefault();
            cancelScroll();
            this.mousemove();
            this.mouseup();
            this.mouseleave();
            this.cancelOnBlur();
            this.touchmove();
            this.touchend();
            this.touchcancel();
            this.gridster.dragInProgress = false;
            this.gridster.updateGrid();
            if (this.gridster.options.resizable &&
                this.gridster.options.resizable.stop) {
                Promise.resolve(this.gridster.options.resizable.stop(this.gridsterItem.item, this.gridsterItem, e)).then(this.makeResize, this.cancelResize);
            }
            else {
                this.makeResize();
            }
            setTimeout(() => {
                this.gridsterItem.renderer.removeClass(this.gridsterItem.el, 'gridster-item-resizing');
                if (this.gridster) {
                    this.gridster.movingItem = null;
                    this.gridster.previewStyle();
                }
            });
        };
        this.cancelResize = () => {
            this.gridsterItem.$item.cols = this.gridsterItem.item.cols || 1;
            this.gridsterItem.$item.rows = this.gridsterItem.item.rows || 1;
            this.gridsterItem.$item.x = this.gridsterItem.item.x || 0;
            this.gridsterItem.$item.y = this.gridsterItem.item.y || 0;
            this.gridsterItem.setSize();
            this.push.restoreItems();
            this.pushResize.restoreItems();
            this.push.destroy();
            this.push = null;
            this.pushResize.destroy();
            this.pushResize = null;
        };
        this.makeResize = () => {
            this.gridsterItem.setSize();
            this.gridsterItem.checkItemChanges(this.gridsterItem.$item, this.gridsterItem.item);
            this.push.setPushedItems();
            this.pushResize.setPushedItems();
            this.push.destroy();
            this.push = null;
            this.pushResize.destroy();
            this.pushResize = null;
        };
        this.handleNorth = (e) => {
            this.top = e.clientY + this.offsetTop - this.diffTop;
            this.height = this.bottom - this.top;
            if (this.minHeight > this.height) {
                this.height = this.minHeight;
                this.top = this.bottom - this.minHeight;
            }
            else if (this.gridster.options.enableBoundaryControl) {
                this.top = Math.max(0, this.top);
                this.height = this.bottom - this.top;
            }
            const marginTop = this.gridster.options.pushItems ? this.margin : 0;
            this.newPosition = this.gridster.pixelsToPositionY(this.top + marginTop, Math.floor);
            if (this.gridsterItem.$item.y !== this.newPosition) {
                this.itemBackup[1] = this.gridsterItem.$item.y;
                this.itemBackup[3] = this.gridsterItem.$item.rows;
                this.gridsterItem.$item.rows +=
                    this.gridsterItem.$item.y - this.newPosition;
                this.gridsterItem.$item.y = this.newPosition;
                this.pushResize.pushItems(this.pushResize.fromSouth);
                this.push.pushItems(this.push.fromSouth, this.gridster.$options.disablePushOnResize);
                if (this.gridster.checkCollision(this.gridsterItem.$item)) {
                    this.gridsterItem.$item.y = this.itemBackup[1];
                    this.gridsterItem.$item.rows = this.itemBackup[3];
                    this.top = this.gridster.positionYToPixels(this.gridsterItem.$item.y);
                    this.setItemTop(this.gridster.positionYToPixels(this.gridsterItem.$item.y));
                    this.setItemHeight(this.gridster.positionYToPixels(this.gridsterItem.$item.rows) -
                        this.margin);
                    return;
                }
                else {
                    this.gridster.previewStyle();
                }
                this.pushResize.checkPushBack();
                this.push.checkPushBack();
            }
            this.setItemTop(this.top);
            this.setItemHeight(this.height);
        };
        this.handleWest = (e) => {
            const clientX = this.gridster.$options.dirType === DirTypes.RTL
                ? this.originalClientX + (this.originalClientX - e.clientX)
                : e.clientX;
            this.left = clientX + this.offsetLeft - this.diffLeft;
            this.width = this.right - this.left;
            if (this.minWidth > this.width) {
                this.width = this.minWidth;
                this.left = this.right - this.minWidth;
            }
            else if (this.gridster.options.enableBoundaryControl) {
                this.left = Math.max(0, this.left);
                this.width = this.right - this.left;
            }
            const marginLeft = this.gridster.options.pushItems ? this.margin : 0;
            this.newPosition = this.gridster.pixelsToPositionX(this.left + marginLeft, Math.floor);
            if (this.gridsterItem.$item.x !== this.newPosition) {
                this.itemBackup[0] = this.gridsterItem.$item.x;
                this.itemBackup[2] = this.gridsterItem.$item.cols;
                this.gridsterItem.$item.cols +=
                    this.gridsterItem.$item.x - this.newPosition;
                this.gridsterItem.$item.x = this.newPosition;
                this.pushResize.pushItems(this.pushResize.fromEast);
                this.push.pushItems(this.push.fromEast, this.gridster.$options.disablePushOnResize);
                if (this.gridster.checkCollision(this.gridsterItem.$item)) {
                    this.gridsterItem.$item.x = this.itemBackup[0];
                    this.gridsterItem.$item.cols = this.itemBackup[2];
                    this.left = this.gridster.positionXToPixels(this.gridsterItem.$item.x);
                    this.setItemLeft(this.gridster.positionXToPixels(this.gridsterItem.$item.x));
                    this.setItemWidth(this.gridster.positionXToPixels(this.gridsterItem.$item.cols) -
                        this.margin);
                    return;
                }
                else {
                    this.gridster.previewStyle();
                }
                this.pushResize.checkPushBack();
                this.push.checkPushBack();
            }
            this.setItemLeft(this.left);
            this.setItemWidth(this.width);
        };
        this.handleSouth = (e) => {
            this.height = e.clientY + this.offsetTop - this.diffBottom - this.top;
            if (this.minHeight > this.height) {
                this.height = this.minHeight;
            }
            this.bottom = this.top + this.height;
            if (this.gridster.options.enableBoundaryControl) {
                const margin = this.outerMarginBottom ?? this.margin;
                const box = this.gridster.el.getBoundingClientRect();
                this.bottom = Math.min(this.bottom, box.bottom - box.top - 2 * margin);
                this.height = this.bottom - this.top;
            }
            const marginBottom = this.gridster.options.pushItems ? 0 : this.margin;
            this.newPosition = this.gridster.pixelsToPositionY(this.bottom + marginBottom, Math.ceil);
            if (this.gridsterItem.$item.y + this.gridsterItem.$item.rows !==
                this.newPosition) {
                this.itemBackup[3] = this.gridsterItem.$item.rows;
                this.gridsterItem.$item.rows =
                    this.newPosition - this.gridsterItem.$item.y;
                this.pushResize.pushItems(this.pushResize.fromNorth);
                this.push.pushItems(this.push.fromNorth, this.gridster.$options.disablePushOnResize);
                if (this.gridster.checkCollision(this.gridsterItem.$item)) {
                    this.gridsterItem.$item.rows = this.itemBackup[3];
                    this.setItemHeight(this.gridster.positionYToPixels(this.gridsterItem.$item.rows) -
                        this.margin);
                    return;
                }
                else {
                    this.gridster.previewStyle();
                }
                this.pushResize.checkPushBack();
                this.push.checkPushBack();
            }
            this.setItemHeight(this.height);
        };
        this.handleEast = (e) => {
            const clientX = this.gridster.$options.dirType === DirTypes.RTL
                ? this.originalClientX + (this.originalClientX - e.clientX)
                : e.clientX;
            this.width = clientX + this.offsetLeft - this.diffRight - this.left;
            if (this.minWidth > this.width) {
                this.width = this.minWidth;
            }
            this.right = this.left + this.width;
            if (this.gridster.options.enableBoundaryControl) {
                const margin = this.outerMarginRight ?? this.margin;
                const box = this.gridster.el.getBoundingClientRect();
                this.right = Math.min(this.right, box.right - box.left - 2 * margin);
                this.width = this.right - this.left;
            }
            const marginRight = this.gridster.options.pushItems ? 0 : this.margin;
            this.newPosition = this.gridster.pixelsToPositionX(this.right + marginRight, Math.ceil);
            if (this.gridsterItem.$item.x + this.gridsterItem.$item.cols !==
                this.newPosition) {
                this.itemBackup[2] = this.gridsterItem.$item.cols;
                this.gridsterItem.$item.cols =
                    this.newPosition - this.gridsterItem.$item.x;
                this.pushResize.pushItems(this.pushResize.fromWest);
                this.push.pushItems(this.push.fromWest, this.gridster.$options.disablePushOnResize);
                if (this.gridster.checkCollision(this.gridsterItem.$item)) {
                    this.gridsterItem.$item.cols = this.itemBackup[2];
                    this.setItemWidth(this.gridster.positionXToPixels(this.gridsterItem.$item.cols) -
                        this.margin);
                    return;
                }
                else {
                    this.gridster.previewStyle();
                }
                this.pushResize.checkPushBack();
                this.push.checkPushBack();
            }
            this.setItemWidth(this.width);
        };
        this.handleNorthWest = (e) => {
            this.handleNorth(e);
            this.handleWest(e);
        };
        this.handleNorthEast = (e) => {
            this.handleNorth(e);
            this.handleEast(e);
        };
        this.handleSouthWest = (e) => {
            this.handleSouth(e);
            this.handleWest(e);
        };
        this.handleSouthEast = (e) => {
            this.handleSouth(e);
            this.handleEast(e);
        };
        this.gridsterItem = gridsterItem;
        this.gridster = gridster;
        this.lastMouse = {
            clientX: 0,
            clientY: 0
        };
        this.itemBackup = [0, 0, 0, 0];
        this.resizeEventScrollType = {
            west: false,
            east: false,
            north: false,
            south: false
        };
    }
    destroy() {
        this.gridster?.previewStyle();
        this.gridster = this.gridsterItem = null;
    }
    dragStart(e) {
        if (e.which && e.which !== 1) {
            return;
        }
        if (this.gridster.options.resizable &&
            this.gridster.options.resizable.start) {
            this.gridster.options.resizable.start(this.gridsterItem.item, this.gridsterItem, e);
        }
        e.stopPropagation();
        e.preventDefault();
        this.zone.runOutsideAngular(() => {
            this.mousemove = this.gridsterItem.renderer.listen('document', 'mousemove', this.dragMove);
            this.touchmove = this.gridster.renderer.listen(this.gridster.el, 'touchmove', this.dragMove);
        });
        this.mouseup = this.gridsterItem.renderer.listen('document', 'mouseup', this.dragStop);
        this.mouseleave = this.gridsterItem.renderer.listen('document', 'mouseleave', this.dragStop);
        this.cancelOnBlur = this.gridsterItem.renderer.listen('window', 'blur', this.dragStop);
        this.touchend = this.gridsterItem.renderer.listen('document', 'touchend', this.dragStop);
        this.touchcancel = this.gridsterItem.renderer.listen('document', 'touchcancel', this.dragStop);
        this.gridsterItem.renderer.addClass(this.gridsterItem.el, 'gridster-item-resizing');
        this.lastMouse.clientX = e.clientX;
        this.lastMouse.clientY = e.clientY;
        this.left = this.gridsterItem.left;
        this.top = this.gridsterItem.top;
        this.originalClientX = e.clientX;
        this.originalClientY = e.clientY;
        this.width = this.gridsterItem.width;
        this.height = this.gridsterItem.height;
        this.bottom = this.gridsterItem.top + this.gridsterItem.height;
        this.right = this.gridsterItem.left + this.gridsterItem.width;
        this.margin = this.gridster.$options.margin;
        this.outerMarginTop = this.gridster.$options.outerMarginTop;
        this.outerMarginRight = this.gridster.$options.outerMarginRight;
        this.outerMarginBottom = this.gridster.$options.outerMarginBottom;
        this.outerMarginLeft = this.gridster.$options.outerMarginLeft;
        this.offsetLeft = this.gridster.el.scrollLeft - this.gridster.el.offsetLeft;
        this.offsetTop = this.gridster.el.scrollTop - this.gridster.el.offsetTop;
        this.diffLeft = e.clientX + this.offsetLeft - this.left;
        this.diffRight = e.clientX + this.offsetLeft - this.right;
        this.diffTop = e.clientY + this.offsetTop - this.top;
        this.diffBottom = e.clientY + this.offsetTop - this.bottom;
        this.minHeight =
            this.gridster.positionYToPixels(this.gridsterItem.$item.minItemRows ||
                this.gridster.$options.minItemRows) - this.margin;
        this.minWidth =
            this.gridster.positionXToPixels(this.gridsterItem.$item.minItemCols ||
                this.gridster.$options.minItemCols) - this.margin;
        this.gridster.movingItem = this.gridsterItem.$item;
        this.gridster.previewStyle();
        this.push = new GridsterPush(this.gridsterItem);
        this.pushResize = new GridsterPushResize(this.gridsterItem);
        this.gridster.dragInProgress = true;
        this.gridster.updateGrid();
        const { classList } = e.target;
        if (classList.contains('handle-n')) {
            this.resizeEventScrollType.north = true;
            this.directionFunction = this.handleNorth;
        }
        else if (classList.contains('handle-w')) {
            if (this.gridster.$options.dirType === DirTypes.RTL) {
                this.resizeEventScrollType.east = true;
                this.directionFunction = this.handleEast;
            }
            else {
                this.resizeEventScrollType.west = true;
                this.directionFunction = this.handleWest;
            }
        }
        else if (classList.contains('handle-s')) {
            this.resizeEventScrollType.south = true;
            this.directionFunction = this.handleSouth;
        }
        else if (classList.contains('handle-e')) {
            if (this.gridster.$options.dirType === DirTypes.RTL) {
                this.resizeEventScrollType.west = true;
                this.directionFunction = this.handleWest;
            }
            else {
                this.resizeEventScrollType.east = true;
                this.directionFunction = this.handleEast;
            }
        }
        else if (classList.contains('handle-nw')) {
            if (this.gridster.$options.dirType === DirTypes.RTL) {
                this.resizeEventScrollType.north = true;
                this.resizeEventScrollType.east = true;
                this.directionFunction = this.handleNorthEast;
            }
            else {
                this.resizeEventScrollType.north = true;
                this.resizeEventScrollType.west = true;
                this.directionFunction = this.handleNorthWest;
            }
        }
        else if (classList.contains('handle-ne')) {
            if (this.gridster.$options.dirType === DirTypes.RTL) {
                this.resizeEventScrollType.north = true;
                this.resizeEventScrollType.west = true;
                this.directionFunction = this.handleNorthWest;
            }
            else {
                this.resizeEventScrollType.north = true;
                this.resizeEventScrollType.east = true;
                this.directionFunction = this.handleNorthEast;
            }
        }
        else if (classList.contains('handle-sw')) {
            if (this.gridster.$options.dirType === DirTypes.RTL) {
                this.resizeEventScrollType.south = true;
                this.resizeEventScrollType.east = true;
                this.directionFunction = this.handleSouthEast;
            }
            else {
                this.resizeEventScrollType.south = true;
                this.resizeEventScrollType.west = true;
                this.directionFunction = this.handleSouthWest;
            }
        }
        else if (classList.contains('handle-se')) {
            if (this.gridster.$options.dirType === DirTypes.RTL) {
                this.resizeEventScrollType.south = true;
                this.resizeEventScrollType.west = true;
                this.directionFunction = this.handleSouthWest;
            }
            else {
                this.resizeEventScrollType.south = true;
                this.resizeEventScrollType.east = true;
                this.directionFunction = this.handleSouthEast;
            }
        }
    }
    toggle() {
        this.resizeEnabled = this.gridsterItem.canBeResized();
        this.resizableHandles = this.gridsterItem.getResizableHandles();
    }
    dragStartDelay(e) {
        GridsterUtils.checkTouchEvent(e);
        if (!this.gridster.$options.resizable.delayStart) {
            this.dragStart(e);
            return;
        }
        const timeout = setTimeout(() => {
            this.dragStart(e);
            cancelDrag();
        }, this.gridster.$options.resizable.delayStart);
        const { cancelMouse, cancelMouseLeave, cancelOnBlur, cancelTouchMove, cancelTouchEnd, cancelTouchCancel } = this.zone.runOutsideAngular(() => {
            // Note: all of these events are being added within the `<root>` zone since they all
            // don't do any view updates and don't require Angular running change detection.
            // All event listeners call `cancelDrag` once the event is dispatched, the `cancelDrag`
            // is responsible only for removing event listeners.
            const cancelMouse = this.gridsterItem.renderer.listen('document', 'mouseup', cancelDrag);
            const cancelMouseLeave = this.gridsterItem.renderer.listen('document', 'mouseleave', cancelDrag);
            const cancelOnBlur = this.gridsterItem.renderer.listen('window', 'blur', cancelDrag);
            const cancelTouchMove = this.gridsterItem.renderer.listen('document', 'touchmove', cancelMove);
            const cancelTouchEnd = this.gridsterItem.renderer.listen('document', 'touchend', cancelDrag);
            const cancelTouchCancel = this.gridsterItem.renderer.listen('document', 'touchcancel', cancelDrag);
            return {
                cancelMouse,
                cancelMouseLeave,
                cancelOnBlur,
                cancelTouchMove,
                cancelTouchEnd,
                cancelTouchCancel
            };
        });
        function cancelMove(eventMove) {
            GridsterUtils.checkTouchEvent(eventMove);
            if (Math.abs(eventMove.clientX - e.clientX) > 9 ||
                Math.abs(eventMove.clientY - e.clientY) > 9) {
                cancelDrag();
            }
        }
        function cancelDrag() {
            clearTimeout(timeout);
            cancelOnBlur();
            cancelMouse();
            cancelMouseLeave();
            cancelTouchMove();
            cancelTouchEnd();
            cancelTouchCancel();
        }
    }
    setItemTop(top) {
        this.gridster.gridRenderer.setCellPosition(this.gridsterItem.renderer, this.gridsterItem.el, this.left, top);
    }
    setItemLeft(left) {
        this.gridster.gridRenderer.setCellPosition(this.gridsterItem.renderer, this.gridsterItem.el, left, this.top);
    }
    setItemHeight(height) {
        this.gridsterItem.renderer.setStyle(this.gridsterItem.el, 'height', height + 'px');
    }
    setItemWidth(width) {
        this.gridsterItem.renderer.setStyle(this.gridsterItem.el, 'width', width + 'px');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JpZHN0ZXJSZXNpemFibGUuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Byb2plY3RzL2FuZ3VsYXItZ3JpZHN0ZXIyL3NyYy9saWIvZ3JpZHN0ZXJSZXNpemFibGUuc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFdEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBR2xFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRXhELE1BQU0sT0FBTyxpQkFBaUI7SUE4RDVCLFlBQ0UsWUFBNEMsRUFDNUMsUUFBb0MsRUFDNUIsSUFBWTtRQUFaLFNBQUksR0FBSixJQUFJLENBQVE7UUF2RHRCOzs7O1dBSUc7UUFDSyxzQkFBaUIsR0FFZCxJQUFJLENBQUM7UUEwT2hCLGFBQVEsR0FBRyxDQUFDLENBQWEsRUFBUSxFQUFFO1lBQ2pDLElBQUksSUFBSSxDQUFDLGlCQUFpQixLQUFLLElBQUksRUFBRTtnQkFDbkMsTUFBTSxJQUFJLEtBQUssQ0FDYixxRUFBcUUsQ0FDdEUsQ0FBQzthQUNIO1lBRUQsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3BCLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNuQixhQUFhLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQztZQUN6RSxJQUFJLENBQUMsVUFBVSxHQUFH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LENBQUM7WUFDdEIsWUFBWSxFQUFFLENBQUM7WUFDZixXQUFXLEVBQUUsQ0FBQztZQUNkLGdCQUFnQixFQUFFLENBQUM7WUFDbkIsZUFBZSxFQUFFLENBQUM7WUFDbEIsY0FBYyxFQUFFLENBQUM7WUFDakIsaUJBQWlCLEVBQUUsQ0FBQztRQUN0QixDQUFDO0lBQ0gsQ0FBQztJQUVELFVBQVUsQ0FBQyxHQUFXO1FBQ3BCLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FDeEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQzFCLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUNwQixJQUFJLENBQUMsSUFBSSxFQUNULEdBQUcsQ0FDSixDQUFDO0lBQ0osQ0FBQztJQUVELFdBQVcsQ0FBQyxJQUFZO1FBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FDeEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQzFCLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUNwQixJQUFJLEVBQ0osSUFBSSxDQUFDLEdBQUcsQ0FDVCxDQUFDO0lBQ0osQ0FBQztJQUVELGFBQWEsQ0FBQyxNQUFjO1FBQzFCLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FDakMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQ3BCLFFBQVEsRUFDUixNQUFNLEdBQUcsSUFBSSxDQUNkLENBQUM7SUFDSixDQUFDO0lBRUQsWUFBWSxDQUFDLEtBQWE7UUFDeEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUNqQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFDcEIsT0FBTyxFQUNQLEtBQUssR0FBRyxJQUFJLENBQ2IsQ0FBQztJQUNKLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5nWm9uZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgR3JpZHN0ZXJDb21wb25lbnRJbnRlcmZhY2UgfSBmcm9tICcuL2dyaWRzdGVyLmludGVyZmFjZSc7XG5pbXBvcnQgeyBEaXJUeXBlcyB9IGZyb20gJy4vZ3JpZHN0ZXJDb25maWcuaW50ZXJmYWNlJztcbmltcG9ydCB7IEdyaWRzdGVySXRlbUNvbXBvbmVudEludGVyZmFjZSB9IGZyb20gJy4vZ3JpZHN0ZXJJdGVtLmludGVyZmFjZSc7XG5pbXBvcnQgeyBHcmlkc3RlclB1c2ggfSBmcm9tICcuL2dyaWRzdGVyUHVzaC5zZXJ2aWNlJztcbmltcG9ydCB7IEdyaWRzdGVyUHVzaFJlc2l6ZSB9IGZyb20gJy4vZ3JpZHN0ZXJQdXNoUmVzaXplLnNlcnZpY2UnO1xuaW1wb3J0IHsgR3JpZHN0ZXJSZXNpemVFdmVudFR5cGUgfSBmcm9tICcuL2dyaWRzdGVyUmVzaXplRXZlbnRUeXBlLmludGVyZmFjZSc7XG5cbmltcG9ydCB7IGNhbmNlbFNjcm9sbCwgc2Nyb2xsIH0gZnJvbSAnLi9ncmlkc3RlclNjcm9sbC5zZXJ2aWNlJztcbmltcG9ydCB7IEdyaWRzdGVyVXRpbHMgfSBmcm9tICcuL2dyaWRzdGVyVXRpbHMuc2VydmljZSc7XG5cbmV4cG9ydCBjbGFzcyBHcmlkc3RlclJlc2l6YWJsZSB7XG4gIGdyaWRzdGVySXRlbTogR3JpZHN0ZXJJdGVtQ29tcG9uZW50SW50ZXJmYWNlO1xuICBncmlkc3RlcjogR3JpZHN0ZXJDb21wb25lbnRJbnRlcmZhY2U7XG4gIGxhc3RNb3VzZToge1xuICAgIGNsaWVudFg6IG51bWJlcjtcbiAgICBjbGllbnRZOiBudW1iZXI7XG4gIH07XG4gIGl0ZW1CYWNrdXA6IG51bWJlcltdO1xuICByZXNpemVFdmVudFNjcm9sbFR5cGU6IEdyaWRzdGVyUmVzaXplRXZlbnRUeXBlO1xuXG4gIC8qKlxuICAgKiBUaGUgZGlyZWN0aW9uIGZ1bmN0aW9uIG1heSByZWZlcmVuY2UgYW55IG9mIHRoZSBgR3JpZHN0ZXJSZXNpemFibGVgIGNsYXNzIG1ldGhvZHMsIHRoYXQgYXJlXG4gICAqIHJlc3BvbnNpYmxlIGZvciBncmlkc3RlciByZXNpemUgd2hlbiB0aGUgYGRyYWdtb3ZlYCBldmVudCBpcyBiZWluZyBoYW5kbGVkLiBFLmcuIGl0IG1heSByZWZlcmVuY2VcbiAgICogdGhlIGBoYW5kbGVOb3J0aGAgbWV0aG9kIHdoZW4gdGhlIG5vcnRoIGhhbmRsZSBpcyBwcmVzc2VkIGFuZCBtb3ZlZCBieSBhIG1vdXNlLlxuICAgKi9cbiAgcHJpdmF0ZSBkaXJlY3Rpb25GdW5jdGlvbjpcbiAgICB8ICgoZXZlbnQ6IFBpY2s8TW91c2VFdmVudCwgJ2NsaWVudFgnIHwgJ2NsaWVudFknPikgPT4gdm9pZClcbiAgICB8IG51bGwgPSBudWxsO1xuXG4gIHJlc2l6ZUVuYWJsZWQ6IGJvb2xlYW47XG4gIHJlc2l6YWJsZUhhbmRsZXM6IHtcbiAgICBzOiBib29sZWFuO1xuICAgIGU6IGJvb2xlYW47XG4gICAgbjogYm9vbGVhbjtcbiAgICB3OiBib29sZWFuO1xuICAgIHNlOiBib29sZWFuO1xuICAgIG5lOiBib29sZWFuO1xuICAgIHN3OiBib29sZWFuO1xuICAgIG53OiBib29sZWFuO1xuICB9O1xuICBtb3VzZW1vdmU6ICgpID0+IHZvaWQ7XG4gIG1vdXNldXA6ICgpID0+IHZvaWQ7XG4gIG1vdXNlbGVhdmU6ICgpID0+IHZvaWQ7XG4gIGNhbmNlbE9uQmx1cjogKCkgPT4gdm9pZDtcbiAgdG91Y2htb3ZlOiAoKSA9PiB2b2lkO1xuICB0b3VjaGVuZDogKCkgPT4gdm9pZDtcbiAgdG91Y2hjYW5jZWw6ICgpID0+IHZvaWQ7XG4gIHB1c2g6IEdyaWRzdGVyUHVzaDtcbiAgcHVzaFJlc2l6ZTogR3JpZHN0ZXJQdXNoUmVzaXplO1xuICBtaW5IZWlnaHQ6IG51bWJlcjtcbiAgbWluV2lkdGg6IG51bWJlcjtcbiAgb2Zmc2V0VG9wOiBudW1iZXI7XG4gIG9mZnNldExlZnQ6IG51bWJlcjtcbiAgZGlmZlRvcDogbnVtYmVyO1xuICBkaWZmTGVmdDogbnVtYmVyO1xuICBkaWZmUmlnaHQ6IG51bWJlcjtcbiAgZGlmZkJvdHRvbTogbnVtYmVyO1xuICBtYXJnaW46IG51bWJlcjtcbiAgb3V0ZXJNYXJnaW5Ub3A6IG51bWJlciB8IG51bGw7XG4gIG91dGVyTWFyZ2luUmlnaHQ6IG51bWJlciB8IG51bGw7XG4gIG91dGVyTWFyZ2luQm90dG9tOiBudW1iZXIgfCBudWxsO1xuICBvdXRlck1hcmdpbkxlZnQ6IG51bWJlciB8IG51bGw7XG4gIG9yaWdpbmFsQ2xpZW50WDogbnVtYmVyO1xuICBvcmlnaW5hbENsaWVudFk6IG51bWJlcjtcbiAgdG9wOiBudW1iZXI7XG4gIGxlZnQ6IG51bWJlcjtcbiAgYm90dG9tOiBudW1iZXI7XG4gIHJpZ2h0OiBudW1iZXI7XG4gIHdpZHRoOiBudW1iZXI7XG4gIGhlaWdodDogbnVtYmVyO1xuICBuZXdQb3NpdGlvbjogbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGdyaWRzdGVySXRlbTogR3JpZHN0ZXJJdGVtQ29tcG9uZW50SW50ZXJmYWNlLFxuICAgIGdyaWRzdGVyOiBHcmlkc3RlckNvbXBvbmVudEludGVyZmFjZSxcbiAgICBwcml2YXRlIHpvbmU6IE5nWm9uZVxuICApIHtcbiAgICB0aGlzLmdyaWRzdGVySXRlbSA9IGdyaWRzdGVySXRlbTtcbiAgICB0aGlzLmdyaWRzdGVyID0gZ3JpZHN0ZXI7XG4gICAgdGhpcy5sYXN0TW91c2UgPSB7XG4gICAgICBjbGllbnRYOiAwLFxuICAgICAgY2xpZW50WTogMFxuICAgIH07XG4gICAgdGhpcy5pdGVtQmFja3VwID0gWzAsIDAsIDAsIDBdO1xuICAgIHRoaXMucmVzaXplRXZlbnRTY3JvbGxUeXBlID0ge1xuICAgICAgd2VzdDogZmFsc2UsXG4gICAgICBlYXN0OiBmYWxzZSxcbiAgICAgIG5vcnRoOiBmYWxzZSxcbiAgICAgIHNvdXRoOiBmYWxzZVxuICAgIH07XG4gIH1cblxuICBkZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuZ3JpZHN0ZXI/LnByZXZpZXdTdHlsZSgpO1xuICAgIHRoaXMuZ3JpZHN0ZXIgPSB0aGlzLmdyaWRzdGVySXRlbSA9IG51bGwhO1xuICB9XG5cbiAgZHJhZ1N0YXJ0KGU6IE1vdXNlRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoZS53aGljaCAmJiBlLndoaWNoICE9PSAxKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChcbiAgICAgIHRoaXMuZ3JpZHN0ZXIub3B0aW9ucy5yZXNpemFibGUgJiZcbiAgICAgIHRoaXMuZ3JpZHN0ZXIub3B0aW9ucy5yZXNpemFibGUuc3RhcnRcbiAgICApIHtcbiAgICAgIHRoaXMuZ3JpZHN0ZXIub3B0aW9ucy5yZXNpemFibGUuc3RhcnQoXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLml0ZW0sXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLFxuICAgICAgICBlXG4gICAgICApO1xuICAgIH1cbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIHRoaXMuem9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiB7XG4gICAgICB0aGlzLm1vdXNlbW92ZSA9IHRoaXMuZ3JpZHN0ZXJJdGVtLnJlbmRlcmVyLmxpc3RlbihcbiAgICAgICAgJ2RvY3VtZW50JyxcbiAgICAgICAgJ21vdXNlbW92ZScsXG4gICAgICAgIHRoaXMuZHJhZ01vdmVcbiAgICAgICk7XG4gICAgICB0aGlzLnRvdWNobW92ZSA9IHRoaXMuZ3JpZHN0ZXIucmVuZGVyZXIubGlzdGVuKFxuICAgICAgICB0aGlzLmdyaWRzdGVyLmVsLFxuICAgICAgICAndG91Y2htb3ZlJyxcbiAgICAgICAgdGhpcy5kcmFnTW92ZVxuICAgICAgKTtcbiAgICB9KTtcbiAgICB0aGlzLm1vdXNldXAgPSB0aGlzLmdyaWRzdGVySXRlbS5yZW5kZXJlci5saXN0ZW4oXG4gICAgICAnZG9jdW1lbnQnLFxuICAgICAgJ21vdXNldXAnLFxuICAgICAgdGhpcy5kcmFnU3RvcFxuICAgICk7XG4gICAgdGhpcy5tb3VzZWxlYXZlID0gdGhpcy5ncmlkc3Rlckl0ZW0ucmVuZGVyZXIubGlzdGVuKFxuICAgICAgJ2RvY3VtZW50JyxcbiAgICAgICdtb3VzZWxlYXZlJyxcbiAgICAgIHRoaXMuZHJhZ1N0b3BcbiAgICApO1xuICAgIHRoaXMuY2FuY2VsT25CbHVyID0gdGhpcy5ncmlkc3Rlckl0ZW0ucmVuZGVyZXIubGlzdGVuKFxuICAgICAgJ3dpbmRvdycsXG4gICAgICAnYmx1cicsXG4gICAgICB0aGlzLmRyYWdTdG9wXG4gICAgKTtcbiAgICB0aGlzLnRvdWNoZW5kID0gdGhpcy5ncmlkc3Rlckl0ZW0ucmVuZGVyZXIubGlzdGVuKFxuICAgICAgJ2RvY3VtZW50JyxcbiAgICAgICd0b3VjaGVuZCcsXG4gICAgICB0aGlzLmRyYWdTdG9wXG4gICAgKTtcbiAgICB0aGlzLnRvdWNoY2FuY2VsID0gdGhpcy5ncmlkc3Rlckl0ZW0ucmVuZGVyZXIubGlzdGVuKFxuICAgICAgJ2RvY3VtZW50JyxcbiAgICAgICd0b3VjaGNhbmNlbCcsXG4gICAgICB0aGlzLmRyYWdTdG9wXG4gICAgKTtcblxuICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLnJlbmRlcmVyLmFkZENsYXNzKFxuICAgICAgdGhpcy5ncmlkc3Rlckl0ZW0uZWwsXG4gICAgICAnZ3JpZHN0ZXItaXRlbS1yZXNpemluZydcbiAgICApO1xuICAgIHRoaXMubGFzdE1vdXNlLmNsaWVudFggPSBlLmNsaWVudFg7XG4gICAgdGhpcy5sYXN0TW91c2UuY2xpZW50WSA9IGUuY2xpZW50WTtcbiAgICB0aGlzLmxlZnQgPSB0aGlzLmdyaWRzdGVySXRlbS5sZWZ0O1xuICAgIHRoaXMudG9wID0gdGhpcy5ncmlkc3Rlckl0ZW0udG9wO1xuICAgIHRoaXMub3JpZ2luYWxDbGllbnRYID0gZS5jbGllbnRYO1xuICAgIHRoaXMub3JpZ2luYWxDbGllbnRZID0gZS5jbGllbnRZO1xuICAgIHRoaXMud2lkdGggPSB0aGlzLmdyaWRzdGVySXRlbS53aWR0aDtcbiAgICB0aGlzLmhlaWdodCA9IHRoaXMuZ3JpZHN0ZXJJdGVtLmhlaWdodDtcbiAgICB0aGlzLmJvdHRvbSA9IHRoaXMuZ3JpZHN0ZXJJdGVtLnRvcCArIHRoaXMuZ3JpZHN0ZXJJdGVtLmhlaWdodDtcbiAgICB0aGlzLnJpZ2h0ID0gdGhpcy5ncmlkc3Rlckl0ZW0ubGVmdCArIHRoaXMuZ3JpZHN0ZXJJdGVtLndpZHRoO1xuICAgIHRoaXMubWFyZ2luID0gdGhpcy5ncmlkc3Rlci4kb3B0aW9ucy5tYXJnaW47XG4gICAgdGhpcy5vdXRlck1hcmdpblRvcCA9IHRoaXMuZ3JpZHN0ZXIuJG9wdGlvbnMub3V0ZXJNYXJnaW5Ub3A7XG4gICAgdGhpcy5vdXRlck1hcmdpblJpZ2h0ID0gdGhpcy5ncmlkc3Rlci4kb3B0aW9ucy5vdXRlck1hcmdpblJpZ2h0O1xuICAgIHRoaXMub3V0ZXJNYXJnaW5Cb3R0b20gPSB0aGlzLmdyaWRzdGVyLiRvcHRpb25zLm91dGVyTWFyZ2luQm90dG9tO1xuICAgIHRoaXMub3V0ZXJNYXJnaW5MZWZ0ID0gdGhpcy5ncmlkc3Rlci4kb3B0aW9ucy5vdXRlck1hcmdpbkxlZnQ7XG4gICAgdGhpcy5vZmZzZXRMZWZ0ID0gdGhpcy5ncmlkc3Rlci5lbC5zY3JvbGxMZWZ0IC0gdGhpcy5ncmlkc3Rlci5lbC5vZmZzZXRMZWZ0O1xuICAgIHRoaXMub2Zmc2V0VG9wID0gdGhpcy5ncmlkc3Rlci5lbC5zY3JvbGxUb3AgLSB0aGlzLmdyaWRzdGVyLmVsLm9mZnNldFRvcDtcbiAgICB0aGlzLmRpZmZMZWZ0ID0gZS5jbGllbnRYICsgdGhpcy5vZmZzZXRMZWZ0IC0gdGhpcy5sZWZ0O1xuICAgIHRoaXMuZGlmZlJpZ2h0ID0gZS5jbGllbnRYICsgdGhpcy5vZmZzZXRMZWZ0IC0gdGhpcy5yaWdodDtcbiAgICB0aGlzLmRpZmZUb3AgPSBlLmNsaWVudFkgKyB0aGlzLm9mZnNldFRvcCAtIHRoaXMudG9wO1xuICAgIHRoaXMuZGlmZkJvdHRvbSA9IGUuY2xpZW50WSArIHRoaXMub2Zmc2V0VG9wIC0gdGhpcy5ib3R0b207XG4gICAgdGhpcy5taW5IZWlnaHQgPVxuICAgICAgdGhpcy5ncmlkc3Rlci5wb3NpdGlvbllUb1BpeGVscyhcbiAgICAgICAgdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0ubWluSXRlbVJvd3MgfHxcbiAgICAgICAgICB0aGlzLmdyaWRzdGVyLiRvcHRpb25zLm1pbkl0ZW1Sb3dzXG4gICAgICApIC0gdGhpcy5tYXJnaW47XG4gICAgdGhpcy5taW5XaWR0aCA9XG4gICAgICB0aGlzLmdyaWRzdGVyLnBvc2l0aW9uWFRvUGl4ZWxzKFxuICAgICAgICB0aGlzLmdyaWRzdGVySXRlbS4kaXRlbS5taW5JdGVtQ29scyB8fFxuICAgICAgICAgIHRoaXMuZ3JpZHN0ZXIuJG9wdGlvbnMubWluSXRlbUNvbHNcbiAgICAgICkgLSB0aGlzLm1hcmdpbjtcbiAgICB0aGlzLmdyaWRzdGVyLm1vdmluZ0l0ZW0gPSB0aGlzLmdyaWRzdGVySXRlbS4kaXRlbTtcbiAgICB0aGlzLmdyaWRzdGVyLnByZXZpZXdTdHlsZSgpO1xuICAgIHRoaXMucHVzaCA9IG5ldyBHcmlkc3RlclB1c2godGhpcy5ncmlkc3Rlckl0ZW0pO1xuICAgIHRoaXMucHVzaFJlc2l6ZSA9IG5ldyBHcmlkc3RlclB1c2hSZXNpemUodGhpcy5ncmlkc3Rlckl0ZW0pO1xuICAgIHRoaXMuZ3JpZHN0ZXIuZHJhZ0luUHJvZ3Jlc3MgPSB0cnVlO1xuICAgIHRoaXMuZ3JpZHN0ZXIudXBkYXRlR3JpZCgpO1xuXG4gICAgY29uc3QgeyBjbGFzc0xpc3QgfSA9IGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xuXG4gICAgaWYgKGNsYXNzTGlzdC5jb250YWlucygnaGFuZGxlLW4nKSkge1xuICAgICAgdGhpcy5yZXNpemVFdmVudFNjcm9sbFR5cGUubm9ydGggPSB0cnVlO1xuICAgICAgdGhpcy5kaXJlY3Rpb25GdW5jdGlvbiA9IHRoaXMuaGFuZGxlTm9ydGg7XG4gICAgfSBlbHNlIGlmIChjbGFzc0xpc3QuY29udGFpbnMoJ2hhbmRsZS13JykpIHtcbiAgICAgIGlmICh0aGlzLmdyaWRzdGVyLiRvcHRpb25zLmRpclR5cGUgPT09IERpclR5cGVzLlJUTCkge1xuICAgICAgICB0aGlzLnJlc2l6ZUV2ZW50U2Nyb2xsVHlwZS5lYXN0ID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5kaXJlY3Rpb25GdW5jdGlvbiA9IHRoaXMuaGFuZGxlRWFzdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucmVzaXplRXZlbnRTY3JvbGxUeXBlLndlc3QgPSB0cnVlO1xuICAgICAgICB0aGlzLmRpcmVjdGlvbkZ1bmN0aW9uID0gdGhpcy5oYW5kbGVXZXN0O1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY2xhc3NMaXN0LmNvbnRhaW5zKCdoYW5kbGUtcycpKSB7XG4gICAgICB0aGlzLnJlc2l6ZUV2ZW50U2Nyb2xsVHlwZS5zb3V0aCA9IHRydWU7XG4gICAgICB0aGlzLmRpcmVjdGlvbkZ1bmN0aW9uID0gdGhpcy5oYW5kbGVTb3V0aDtcbiAgICB9IGVsc2UgaWYgKGNsYXNzTGlzdC5jb250YWlucygnaGFuZGxlLWUnKSkge1xuICAgICAgaWYgKHRoaXMuZ3JpZHN0ZXIuJG9wdGlvbnMuZGlyVHlwZSA9PT0gRGlyVHlwZXMuUlRMKSB7XG4gICAgICAgIHRoaXMucmVzaXplRXZlbnRTY3JvbGxUeXBlLndlc3QgPSB0cnVlO1xuICAgICAgICB0aGlzLmRpcmVjdGlvbkZ1bmN0aW9uID0gdGhpcy5oYW5kbGVXZXN0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5yZXNpemVFdmVudFNjcm9sbFR5cGUuZWFzdCA9IHRydWU7XG4gICAgICAgIHRoaXMuZGlyZWN0aW9uRnVuY3Rpb24gPSB0aGlzLmhhbmRsZUVhc3Q7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjbGFzc0xpc3QuY29udGFpbnMoJ2hhbmRsZS1udycpKSB7XG4gICAgICBpZiAodGhpcy5ncmlkc3Rlci4kb3B0aW9ucy5kaXJUeXBlID09PSBEaXJUeXBlcy5SVEwpIHtcbiAgICAgICAgdGhpcy5yZXNpemVFdmVudFNjcm9sbFR5cGUubm9ydGggPSB0cnVlO1xuICAgICAgICB0aGlzLnJlc2l6ZUV2ZW50U2Nyb2xsVHlwZS5lYXN0ID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5kaXJlY3Rpb25GdW5jdGlvbiA9IHRoaXMuaGFuZGxlTm9ydGhFYXN0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5yZXNpemVFdmVudFNjcm9sbFR5cGUubm9ydGggPSB0cnVlO1xuICAgICAgICB0aGlzLnJlc2l6ZUV2ZW50U2Nyb2xsVHlwZS53ZXN0ID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5kaXJlY3Rpb25GdW5jdGlvbiA9IHRoaXMuaGFuZGxlTm9ydGhXZXN0O1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY2xhc3NMaXN0LmNvbnRhaW5zKCdoYW5kbGUtbmUnKSkge1xuICAgICAgaWYgKHRoaXMuZ3JpZHN0ZXIuJG9wdGlvbnMuZGlyVHlwZSA9PT0gRGlyVHlwZXMuUlRMKSB7XG4gICAgICAgIHRoaXMucmVzaXplRXZlbnRTY3JvbGxUeXBlLm5vcnRoID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5yZXNpemVFdmVudFNjcm9sbFR5cGUud2VzdCA9IHRydWU7XG4gICAgICAgIHRoaXMuZGlyZWN0aW9uRnVuY3Rpb24gPSB0aGlzLmhhbmRsZU5vcnRoV2VzdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucmVzaXplRXZlbnRTY3JvbGxUeXBlLm5vcnRoID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5yZXNpemVFdmVudFNjcm9sbFR5cGUuZWFzdCA9IHRydWU7XG4gICAgICAgIHRoaXMuZGlyZWN0aW9uRnVuY3Rpb24gPSB0aGlzLmhhbmRsZU5vcnRoRWFzdDtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNsYXNzTGlzdC5jb250YWlucygnaGFuZGxlLXN3JykpIHtcbiAgICAgIGlmICh0aGlzLmdyaWRzdGVyLiRvcHRpb25zLmRpclR5cGUgPT09IERpclR5cGVzLlJUTCkge1xuICAgICAgICB0aGlzLnJlc2l6ZUV2ZW50U2Nyb2xsVHlwZS5zb3V0aCA9IHRydWU7XG4gICAgICAgIHRoaXMucmVzaXplRXZlbnRTY3JvbGxUeXBlLmVhc3QgPSB0cnVlO1xuICAgICAgICB0aGlzLmRpcmVjdGlvbkZ1bmN0aW9uID0gdGhpcy5oYW5kbGVTb3V0aEVhc3Q7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnJlc2l6ZUV2ZW50U2Nyb2xsVHlwZS5zb3V0aCA9IHRydWU7XG4gICAgICAgIHRoaXMucmVzaXplRXZlbnRTY3JvbGxUeXBlLndlc3QgPSB0cnVlO1xuICAgICAgICB0aGlzLmRpcmVjdGlvbkZ1bmN0aW9uID0gdGhpcy5oYW5kbGVTb3V0aFdlc3Q7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjbGFzc0xpc3QuY29udGFpbnMoJ2hhbmRsZS1zZScpKSB7XG4gICAgICBpZiAodGhpcy5ncmlkc3Rlci4kb3B0aW9ucy5kaXJUeXBlID09PSBEaXJUeXBlcy5SVEwpIHtcbiAgICAgICAgdGhpcy5yZXNpemVFdmVudFNjcm9sbFR5cGUuc291dGggPSB0cnVlO1xuICAgICAgICB0aGlzLnJlc2l6ZUV2ZW50U2Nyb2xsVHlwZS53ZXN0ID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5kaXJlY3Rpb25GdW5jdGlvbiA9IHRoaXMuaGFuZGxlU291dGhXZXN0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5yZXNpemVFdmVudFNjcm9sbFR5cGUuc291dGggPSB0cnVlO1xuICAgICAgICB0aGlzLnJlc2l6ZUV2ZW50U2Nyb2xsVHlwZS5lYXN0ID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5kaXJlY3Rpb25GdW5jdGlvbiA9IHRoaXMuaGFuZGxlU291dGhFYXN0O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGRyYWdNb3ZlID0gKGU6IE1vdXNlRXZlbnQpOiB2b2lkID0+IHtcbiAgICBpZiAodGhpcy5kaXJlY3Rpb25GdW5jdGlvbiA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnVGhlIGBkaXJlY3Rpb25GdW5jdGlvbmAgaGFzIG5vdCBiZWVuIHNldCBiZWZvcmUgY2FsbGluZyBgZHJhZ01vdmVgLidcbiAgICAgICk7XG4gICAgfVxuXG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgR3JpZHN0ZXJVdGlscy5jaGVja1RvdWNoRXZlbnQoZSk7XG4gICAgdGhpcy5vZmZzZXRUb3AgPSB0aGlzLmdyaWRzdGVyLmVsLnNjcm9sbFRvcCAtIHRoaXMuZ3JpZHN0ZXIuZWwub2Zmc2V0VG9wO1xuICAgIHRoaXMub2Zmc2V0TGVmdCA9IHRoaXMuZ3JpZHN0ZXIuZWwuc2Nyb2xsTGVmdCAtIHRoaXMuZ3JpZHN0ZXIuZWwub2Zmc2V0TGVmdDtcbiAgICBzY3JvbGwoXG4gICAgICB0aGlzLmdyaWRzdGVyLFxuICAgICAgdGhpcy5sZWZ0LFxuICAgICAgdGhpcy50b3AsXG4gICAgICB0aGlzLndpZHRoLFxuICAgICAgdGhpcy5oZWlnaHQsXG4gICAgICBlLFxuICAgICAgdGhpcy5sYXN0TW91c2UsXG4gICAgICB0aGlzLmRpcmVjdGlvbkZ1bmN0aW9uLFxuICAgICAgdHJ1ZSxcbiAgICAgIHRoaXMucmVzaXplRXZlbnRTY3JvbGxUeXBlXG4gICAgKTtcblxuICAgIGNvbnN0IHNjYWxlID0gdGhpcy5ncmlkc3Rlci5vcHRpb25zLnNjYWxlIHx8IDE7XG4gICAgdGhpcy5kaXJlY3Rpb25GdW5jdGlvbih7XG4gICAgICBjbGllbnRYOlxuICAgICAgICB0aGlzLm9yaWdpbmFsQ2xpZW50WCArIChlLmNsaWVudFggLSB0aGlzLm9yaWdpbmFsQ2xpZW50WCkgLyBzY2FsZSxcbiAgICAgIGNsaWVudFk6IHRoaXMub3JpZ2luYWxDbGllbnRZICsgKGUuY2xpZW50WSAtIHRoaXMub3JpZ2luYWxDbGllbnRZKSAvIHNjYWxlXG4gICAgfSk7XG5cbiAgICB0aGlzLmxhc3RNb3VzZS5jbGllbnRYID0gZS5jbGllbnRYO1xuICAgIHRoaXMubGFzdE1vdXNlLmNsaWVudFkgPSBlLmNsaWVudFk7XG4gICAgdGhpcy56b25lLnJ1bigoKSA9PiB7XG4gICAgICB0aGlzLmdyaWRzdGVyLnVwZGF0ZUdyaWQoKTtcbiAgICB9KTtcbiAgfTtcblxuICBkcmFnU3RvcCA9IChlOiBNb3VzZUV2ZW50KTogdm9pZCA9PiB7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgY2FuY2VsU2Nyb2xsKCk7XG4gICAgdGhpcy5tb3VzZW1vdmUoKTtcbiAgICB0aGlzLm1vdXNldXAoKTtcbiAgICB0aGlzLm1vdXNlbGVhdmUoKTtcbiAgICB0aGlzLmNhbmNlbE9uQmx1cigpO1xuICAgIHRoaXMudG91Y2htb3ZlKCk7XG4gICAgdGhpcy50b3VjaGVuZCgpO1xuICAgIHRoaXMudG91Y2hjYW5jZWwoKTtcbiAgICB0aGlzLmdyaWRzdGVyLmRyYWdJblByb2dyZXNzID0gZmFsc2U7XG4gICAgdGhpcy5ncmlkc3Rlci51cGRhdGVHcmlkKCk7XG4gICAgaWYgKFxuICAgICAgdGhpcy5ncmlkc3Rlci5vcHRpb25zLnJlc2l6YWJsZSAmJlxuICAgICAgdGhpcy5ncmlkc3Rlci5vcHRpb25zLnJlc2l6YWJsZS5zdG9wXG4gICAgKSB7XG4gICAgICBQcm9taXNlLnJlc29sdmUoXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXIub3B0aW9ucy5yZXNpemFibGUuc3RvcChcbiAgICAgICAgICB0aGlzLmdyaWRzdGVySXRlbS5pdGVtLFxuICAgICAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLFxuICAgICAgICAgIGVcbiAgICAgICAgKVxuICAgICAgKS50aGVuKHRoaXMubWFrZVJlc2l6ZSwgdGhpcy5jYW5jZWxSZXNpemUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm1ha2VSZXNpemUoKTtcbiAgICB9XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLmdyaWRzdGVySXRlbS5yZW5kZXJlci5yZW1vdmVDbGFzcyhcbiAgICAgICAgdGhpcy5ncmlkc3Rlckl0ZW0uZWwsXG4gICAgICAgICdncmlkc3Rlci1pdGVtLXJlc2l6aW5nJ1xuICAgICAgKTtcbiAgICAgIGlmICh0aGlzLmdyaWRzdGVyKSB7XG4gICAgICAgIHRoaXMuZ3JpZHN0ZXIubW92aW5nSXRlbSA9IG51bGw7XG4gICAgICAgIHRoaXMuZ3JpZHN0ZXIucHJldmlld1N0eWxlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgY2FuY2VsUmVzaXplID0gKCk6IHZvaWQgPT4ge1xuICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtLmNvbHMgPSB0aGlzLmdyaWRzdGVySXRlbS5pdGVtLmNvbHMgfHwgMTtcbiAgICB0aGlzLmdyaWRzdGVySXRlbS4kaXRlbS5yb3dzID0gdGhpcy5ncmlkc3Rlckl0ZW0uaXRlbS5yb3dzIHx8IDE7XG4gICAgdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0ueCA9IHRoaXMuZ3JpZHN0ZXJJdGVtLml0ZW0ueCB8fCAwO1xuICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtLnkgPSB0aGlzLmdyaWRzdGVySXRlbS5pdGVtLnkgfHwgMDtcbiAgICB0aGlzLmdyaWRzdGVySXRlbS5zZXRTaXplKCk7XG4gICAgdGhpcy5wdXNoLnJlc3RvcmVJdGVtcygpO1xuICAgIHRoaXMucHVzaFJlc2l6ZS5yZXN0b3JlSXRlbXMoKTtcbiAgICB0aGlzLnB1c2guZGVzdHJveSgpO1xuICAgIHRoaXMucHVzaCA9IG51bGwhO1xuICAgIHRoaXMucHVzaFJlc2l6ZS5kZXN0cm95KCk7XG4gICAgdGhpcy5wdXNoUmVzaXplID0gbnVsbCE7XG4gIH07XG5cbiAgbWFrZVJlc2l6ZSA9ICgpOiB2b2lkID0+IHtcbiAgICB0aGlzLmdyaWRzdGVySXRlbS5zZXRTaXplKCk7XG4gICAgdGhpcy5ncmlkc3Rlckl0ZW0uY2hlY2tJdGVtQ2hhbmdlcyhcbiAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtLFxuICAgICAgdGhpcy5ncmlkc3Rlckl0ZW0uaXRlbVxuICAgICk7XG4gICAgdGhpcy5wdXNoLnNldFB1c2hlZEl0ZW1zKCk7XG4gICAgdGhpcy5wdXNoUmVzaXplLnNldFB1c2hlZEl0ZW1zKCk7XG4gICAgdGhpcy5wdXNoLmRlc3Ryb3koKTtcbiAgICB0aGlzLnB1c2ggPSBudWxsITtcbiAgICB0aGlzLnB1c2hSZXNpemUuZGVzdHJveSgpO1xuICAgIHRoaXMucHVzaFJlc2l6ZSA9IG51bGwhO1xuICB9O1xuXG4gIHByaXZhdGUgaGFuZGxlTm9ydGggPSAoZTogTW91c2VFdmVudCk6IHZvaWQgPT4ge1xuICAgIHRoaXMudG9wID0gZS5jbGllbnRZICsgdGhpcy5vZmZzZXRUb3AgLSB0aGlzLmRpZmZUb3A7XG4gICAgdGhpcy5oZWlnaHQgPSB0aGlzLmJvdHRvbSAtIHRoaXMudG9wO1xuICAgIGlmICh0aGlzLm1pbkhlaWdodCA+IHRoaXMuaGVpZ2h0KSB7XG4gICAgICB0aGlzLmhlaWdodCA9IHRoaXMubWluSGVpZ2h0O1xuICAgICAgdGhpcy50b3AgPSB0aGlzLmJvdHRvbSAtIHRoaXMubWluSGVpZ2h0O1xuICAgIH0gZWxzZSBpZiAodGhpcy5ncmlkc3Rlci5vcHRpb25zLmVuYWJsZUJvdW5kYXJ5Q29udHJvbCkge1xuICAgICAgdGhpcy50b3AgPSBNYXRoLm1heCgwLCB0aGlzLnRvcCk7XG4gICAgICB0aGlzLmhlaWdodCA9IHRoaXMuYm90dG9tIC0gdGhpcy50b3A7XG4gICAgfVxuICAgIGNvbnN0IG1hcmdpblRvcCA9IHRoaXMuZ3JpZHN0ZXIub3B0aW9ucy5wdXNoSXRlbXMgPyB0aGlzLm1hcmdpbiA6IDA7XG4gICAgdGhpcy5uZXdQb3NpdGlvbiA9IHRoaXMuZ3JpZHN0ZXIucGl4ZWxzVG9Qb3NpdGlvblkoXG4gICAgICB0aGlzLnRvcCArIG1hcmdpblRvcCxcbiAgICAgIE1hdGguZmxvb3JcbiAgICApO1xuICAgIGlmICh0aGlzLmdyaWRzdGVySXRlbS4kaXRlbS55ICE9PSB0aGlzLm5ld1Bvc2l0aW9uKSB7XG4gICAgICB0aGlzLml0ZW1CYWNrdXBbMV0gPSB0aGlzLmdyaWRzdGVySXRlbS4kaXRlbS55O1xuICAgICAgdGhpcy5pdGVtQmFja3VwWzNdID0gdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0ucm93cztcbiAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtLnJvd3MgKz1cbiAgICAgICAgdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0ueSAtIHRoaXMubmV3UG9zaXRpb247XG4gICAgICB0aGlzLmdyaWRzdGVySXRlbS4kaXRlbS55ID0gdGhpcy5uZXdQb3NpdGlvbjtcbiAgICAgIHRoaXMucHVzaFJlc2l6ZS5wdXNoSXRlbXModGhpcy5wdXNoUmVzaXplLmZyb21Tb3V0aCk7XG4gICAgICB0aGlzLnB1c2gucHVzaEl0ZW1zKFxuICAgICAgICB0aGlzLnB1c2guZnJvbVNvdXRoLFxuICAgICAgICB0aGlzLmdyaWRzdGVyLiRvcHRpb25zLmRpc2FibGVQdXNoT25SZXNpemVcbiAgICAgICk7XG4gICAgICBpZiAodGhpcy5ncmlkc3Rlci5jaGVja0NvbGxpc2lvbih0aGlzLmdyaWRzdGVySXRlbS4kaXRlbSkpIHtcbiAgICAgICAgdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0ueSA9IHRoaXMuaXRlbUJhY2t1cFsxXTtcbiAgICAgICAgdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0ucm93cyA9IHRoaXMuaXRlbUJhY2t1cFszXTtcbiAgICAgICAgdGhpcy50b3AgPSB0aGlzLmdyaWRzdGVyLnBvc2l0aW9uWVRvUGl4ZWxzKHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtLnkpO1xuICAgICAgICB0aGlzLnNldEl0ZW1Ub3AoXG4gICAgICAgICAgdGhpcy5ncmlkc3Rlci5wb3NpdGlvbllUb1BpeGVscyh0aGlzLmdyaWRzdGVySXRlbS4kaXRlbS55KVxuICAgICAgICApO1xuICAgICAgICB0aGlzLnNldEl0ZW1IZWlnaHQoXG4gICAgICAgICAgdGhpcy5ncmlkc3Rlci5wb3NpdGlvbllUb1BpeGVscyh0aGlzLmdyaWRzdGVySXRlbS4kaXRlbS5yb3dzKSAtXG4gICAgICAgICAgICB0aGlzLm1hcmdpblxuICAgICAgICApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmdyaWRzdGVyLnByZXZpZXdTdHlsZSgpO1xuICAgICAgfVxuICAgICAgdGhpcy5wdXNoUmVzaXplLmNoZWNrUHVzaEJhY2soKTtcbiAgICAgIHRoaXMucHVzaC5jaGVja1B1c2hCYWNrKCk7XG4gICAgfVxuICAgIHRoaXMuc2V0SXRlbVRvcCh0aGlzLnRvcCk7XG4gICAgdGhpcy5zZXRJdGVtSGVpZ2h0KHRoaXMuaGVpZ2h0KTtcbiAgfTtcblxuICBwcml2YXRlIGhhbmRsZVdlc3QgPSAoZTogTW91c2VFdmVudCk6IHZvaWQgPT4ge1xuICAgIGNvbnN0IGNsaWVudFggPVxuICAgICAgdGhpcy5ncmlkc3Rlci4kb3B0aW9ucy5kaXJUeXBlID09PSBEaXJUeXBlcy5SVExcbiAgICAgICAgPyB0aGlzLm9yaWdpbmFsQ2xpZW50WCArICh0aGlzLm9yaWdpbmFsQ2xpZW50WCAtIGUuY2xpZW50WClcbiAgICAgICAgOiBlLmNsaWVudFg7XG4gICAgdGhpcy5sZWZ0ID0gY2xpZW50WCArIHRoaXMub2Zmc2V0TGVmdCAtIHRoaXMuZGlmZkxlZnQ7XG5cbiAgICB0aGlzLndpZHRoID0gdGhpcy5yaWdodCAtIHRoaXMubGVmdDtcbiAgICBpZiAodGhpcy5taW5XaWR0aCA+IHRoaXMud2lkdGgpIHtcbiAgICAgIHRoaXMud2lkdGggPSB0aGlzLm1pbldpZHRoO1xuICAgICAgdGhpcy5sZWZ0ID0gdGhpcy5yaWdodCAtIHRoaXMubWluV2lkdGg7XG4gICAgfSBlbHNlIGlmICh0aGlzLmdyaWRzdGVyLm9wdGlvbnMuZW5hYmxlQm91bmRhcnlDb250cm9sKSB7XG4gICAgICB0aGlzLmxlZnQgPSBNYXRoLm1heCgwLCB0aGlzLmxlZnQpO1xuICAgICAgdGhpcy53aWR0aCA9IHRoaXMucmlnaHQgLSB0aGlzLmxlZnQ7XG4gICAgfVxuICAgIGNvbnN0IG1hcmdpbkxlZnQgPSB0aGlzLmdyaWRzdGVyLm9wdGlvbnMucHVzaEl0ZW1zID8gdGhpcy5tYXJnaW4gOiAwO1xuICAgIHRoaXMubmV3UG9zaXRpb24gPSB0aGlzLmdyaWRzdGVyLnBpeGVsc1RvUG9zaXRpb25YKFxuICAgICAgdGhpcy5sZWZ0ICsgbWFyZ2luTGVmdCxcbiAgICAgIE1hdGguZmxvb3JcbiAgICApO1xuICAgIGlmICh0aGlzLmdyaWRzdGVySXRlbS4kaXRlbS54ICE9PSB0aGlzLm5ld1Bvc2l0aW9uKSB7XG4gICAgICB0aGlzLml0ZW1CYWNrdXBbMF0gPSB0aGlzLmdyaWRzdGVySXRlbS4kaXRlbS54O1xuICAgICAgdGhpcy5pdGVtQmFja3VwWzJdID0gdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0uY29scztcbiAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtLmNvbHMgKz1cbiAgICAgICAgdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0ueCAtIHRoaXMubmV3UG9zaXRpb247XG4gICAgICB0aGlzLmdyaWRzdGVySXRlbS4kaXRlbS54ID0gdGhpcy5uZXdQb3NpdGlvbjtcbiAgICAgIHRoaXMucHVzaFJlc2l6ZS5wdXNoSXRlbXModGhpcy5wdXNoUmVzaXplLmZyb21FYXN0KTtcbiAgICAgIHRoaXMucHVzaC5wdXNoSXRlbXMoXG4gICAgICAgIHRoaXMucHVzaC5mcm9tRWFzdCxcbiAgICAgICAgdGhpcy5ncmlkc3Rlci4kb3B0aW9ucy5kaXNhYmxlUHVzaE9uUmVzaXplXG4gICAgICApO1xuICAgICAgaWYgKHRoaXMuZ3JpZHN0ZXIuY2hlY2tDb2xsaXNpb24odGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0pKSB7XG4gICAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtLnggPSB0aGlzLml0ZW1CYWNrdXBbMF07XG4gICAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtLmNvbHMgPSB0aGlzLml0ZW1CYWNrdXBbMl07XG4gICAgICAgIHRoaXMubGVmdCA9IHRoaXMuZ3JpZHN0ZXIucG9zaXRpb25YVG9QaXhlbHModGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0ueCk7XG4gICAgICAgIHRoaXMuc2V0SXRlbUxlZnQoXG4gICAgICAgICAgdGhpcy5ncmlkc3Rlci5wb3NpdGlvblhUb1BpeGVscyh0aGlzLmdyaWRzdGVySXRlbS4kaXRlbS54KVxuICAgICAgICApO1xuICAgICAgICB0aGlzLnNldEl0ZW1XaWR0aChcbiAgICAgICAgICB0aGlzLmdyaWRzdGVyLnBvc2l0aW9uWFRvUGl4ZWxzKHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtLmNvbHMpIC1cbiAgICAgICAgICAgIHRoaXMubWFyZ2luXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZ3JpZHN0ZXIucHJldmlld1N0eWxlKCk7XG4gICAgICB9XG4gICAgICB0aGlzLnB1c2hSZXNpemUuY2hlY2tQdXNoQmFjaygpO1xuICAgICAgdGhpcy5wdXNoLmNoZWNrUHVzaEJhY2soKTtcbiAgICB9XG4gICAgdGhpcy5zZXRJdGVtTGVmdCh0aGlzLmxlZnQpO1xuICAgIHRoaXMuc2V0SXRlbVdpZHRoKHRoaXMud2lkdGgpO1xuICB9O1xuXG4gIHByaXZhdGUgaGFuZGxlU291dGggPSAoZTogTW91c2VFdmVudCk6IHZvaWQgPT4ge1xuICAgIHRoaXMuaGVpZ2h0ID0gZS5jbGllbnRZICsgdGhpcy5vZmZzZXRUb3AgLSB0aGlzLmRpZmZCb3R0b20gLSB0aGlzLnRvcDtcbiAgICBpZiAodGhpcy5taW5IZWlnaHQgPiB0aGlzLmhlaWdodCkge1xuICAgICAgdGhpcy5oZWlnaHQgPSB0aGlzLm1pbkhlaWdodDtcbiAgICB9XG4gICAgdGhpcy5ib3R0b20gPSB0aGlzLnRvcCArIHRoaXMuaGVpZ2h0O1xuICAgIGlmICh0aGlzLmdyaWRzdGVyLm9wdGlvbnMuZW5hYmxlQm91bmRhcnlDb250cm9sKSB7XG4gICAgICBjb25zdCBtYXJnaW4gPSB0aGlzLm91dGVyTWFyZ2luQm90dG9tID8/IHRoaXMubWFyZ2luO1xuICAgICAgY29uc3QgYm94ID0gdGhpcy5ncmlkc3Rlci5lbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIHRoaXMuYm90dG9tID0gTWF0aC5taW4oXG4gICAgICAgIHRoaXMuYm90dG9tLFxuICAgICAgICBib3guYm90dG9tIC0gYm94LnRvcCAtIDIgKiBtYXJnaW5cbiAgICAgICk7XG4gICAgICB0aGlzLmhlaWdodCA9IHRoaXMuYm90dG9tIC0gdGhpcy50b3A7XG4gICAgfVxuICAgIGNvbnN0IG1hcmdpbkJvdHRvbSA9IHRoaXMuZ3JpZHN0ZXIub3B0aW9ucy5wdXNoSXRlbXMgPyAwIDogdGhpcy5tYXJnaW47XG4gICAgdGhpcy5uZXdQb3NpdGlvbiA9IHRoaXMuZ3JpZHN0ZXIucGl4ZWxzVG9Qb3NpdGlvblkoXG4gICAgICB0aGlzLmJvdHRvbSArIG1hcmdpbkJvdHRvbSxcbiAgICAgIE1hdGguY2VpbFxuICAgICk7XG4gICAgaWYgKFxuICAgICAgdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0ueSArIHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtLnJvd3MgIT09XG4gICAgICB0aGlzLm5ld1Bvc2l0aW9uXG4gICAgKSB7XG4gICAgICB0aGlzLml0ZW1CYWNrdXBbM10gPSB0aGlzLmdyaWRzdGVySXRlbS4kaXRlbS5yb3dzO1xuICAgICAgdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0ucm93cyA9XG4gICAgICAgIHRoaXMubmV3UG9zaXRpb24gLSB0aGlzLmdyaWRzdGVySXRlbS4kaXRlbS55O1xuICAgICAgdGhpcy5wdXNoUmVzaXplLnB1c2hJdGVtcyh0aGlzLnB1c2hSZXNpemUuZnJvbU5vcnRoKTtcbiAgICAgIHRoaXMucHVzaC5wdXNoSXRlbXMoXG4gICAgICAgIHRoaXMucHVzaC5mcm9tTm9ydGgsXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXIuJG9wdGlvbnMuZGlzYWJsZVB1c2hPblJlc2l6ZVxuICAgICAgKTtcbiAgICAgIGlmICh0aGlzLmdyaWRzdGVyLmNoZWNrQ29sbGlzaW9uKHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtKSkge1xuICAgICAgICB0aGlzLmdyaWRzdGVySXRlbS4kaXRlbS5yb3dzID0gdGhpcy5pdGVtQmFja3VwWzNdO1xuICAgICAgICB0aGlzLnNldEl0ZW1IZWlnaHQoXG4gICAgICAgICAgdGhpcy5ncmlkc3Rlci5wb3NpdGlvbllUb1BpeGVscyh0aGlzLmdyaWRzdGVySXRlbS4kaXRlbS5yb3dzKSAtXG4gICAgICAgICAgICB0aGlzLm1hcmdpblxuICAgICAgICApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmdyaWRzdGVyLnByZXZpZXdTdHlsZSgpO1xuICAgICAgfVxuICAgICAgdGhpcy5wdXNoUmVzaXplLmNoZWNrUHVzaEJhY2soKTtcbiAgICAgIHRoaXMucHVzaC5jaGVja1B1c2hCYWNrKCk7XG4gICAgfVxuICAgIHRoaXMuc2V0SXRlbUhlaWdodCh0aGlzLmhlaWdodCk7XG4gIH07XG5cbiAgcHJpdmF0ZSBoYW5kbGVFYXN0ID0gKGU6IE1vdXNlRXZlbnQpOiB2b2lkID0+IHtcbiAgICBjb25zdCBjbGllbnRYID1cbiAgICAgIHRoaXMuZ3JpZHN0ZXIuJG9wdGlvbnMuZGlyVHlwZSA9PT0gRGlyVHlwZXMuUlRMXG4gICAgICAgID8gdGhpcy5vcmlnaW5hbENsaWVudFggKyAodGhpcy5vcmlnaW5hbENsaWVudFggLSBlLmNsaWVudFgpXG4gICAgICAgIDogZS5jbGllbnRYO1xuICAgIHRoaXMud2lkdGggPSBjbGllbnRYICsgdGhpcy5vZmZzZXRMZWZ0IC0gdGhpcy5kaWZmUmlnaHQgLSB0aGlzLmxlZnQ7XG5cbiAgICBpZiAodGhpcy5taW5XaWR0aCA+IHRoaXMud2lkdGgpIHtcbiAgICAgIHRoaXMud2lkdGggPSB0aGlzLm1pbldpZHRoO1xuICAgIH1cbiAgICB0aGlzLnJpZ2h0ID0gdGhpcy5sZWZ0ICsgdGhpcy53aWR0aDtcbiAgICBpZiAodGhpcy5ncmlkc3Rlci5vcHRpb25zLmVuYWJsZUJvdW5kYXJ5Q29udHJvbCkge1xuICAgICAgY29uc3QgbWFyZ2luID0gdGhpcy5vdXRlck1hcmdpblJpZ2h0ID8/IHRoaXMubWFyZ2luO1xuICAgICAgY29uc3QgYm94ID0gdGhpcy5ncmlkc3Rlci5lbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIHRoaXMucmlnaHQgPSBNYXRoLm1pbih0aGlzLnJpZ2h0LCBib3gucmlnaHQgLSBib3gubGVmdCAtIDIgKiBtYXJnaW4pO1xuICAgICAgdGhpcy53aWR0aCA9IHRoaXMucmlnaHQgLSB0aGlzLmxlZnQ7XG4gICAgfVxuICAgIGNvbnN0IG1hcmdpblJpZ2h0ID0gdGhpcy5ncmlkc3Rlci5vcHRpb25zLnB1c2hJdGVtcyA/IDAgOiB0aGlzLm1hcmdpbjtcbiAgICB0aGlzLm5ld1Bvc2l0aW9uID0gdGhpcy5ncmlkc3Rlci5waXhlbHNUb1Bvc2l0aW9uWChcbiAgICAgIHRoaXMucmlnaHQgKyBtYXJnaW5SaWdodCxcbiAgICAgIE1hdGguY2VpbFxuICAgICk7XG4gICAgaWYgKFxuICAgICAgdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0ueCArIHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtLmNvbHMgIT09XG4gICAgICB0aGlzLm5ld1Bvc2l0aW9uXG4gICAgKSB7XG4gICAgICB0aGlzLml0ZW1CYWNrdXBbMl0gPSB0aGlzLmdyaWRzdGVySXRlbS4kaXRlbS5jb2xzO1xuICAgICAgdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0uY29scyA9XG4gICAgICAgIHRoaXMubmV3UG9zaXRpb24gLSB0aGlzLmdyaWRzdGVySXRlbS4kaXRlbS54O1xuICAgICAgdGhpcy5wdXNoUmVzaXplLnB1c2hJdGVtcyh0aGlzLnB1c2hSZXNpemUuZnJvbVdlc3QpO1xuICAgICAgdGhpcy5wdXNoLnB1c2hJdGVtcyhcbiAgICAgICAgdGhpcy5wdXNoLmZyb21XZXN0LFxuICAgICAgICB0aGlzLmdyaWRzdGVyLiRvcHRpb25zLmRpc2FibGVQdXNoT25SZXNpemVcbiAgICAgICk7XG4gICAgICBpZiAodGhpcy5ncmlkc3Rlci5jaGVja0NvbGxpc2lvbih0aGlzLmdyaWRzdGVySXRlbS4kaXRlbSkpIHtcbiAgICAgICAgdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0uY29scyA9IHRoaXMuaXRlbUJhY2t1cFsyXTtcbiAgICAgICAgdGhpcy5zZXRJdGVtV2lkdGgoXG4gICAgICAgICAgdGhpcy5ncmlkc3Rlci5wb3NpdGlvblhUb1BpeGVscyh0aGlzLmdyaWRzdGVySXRlbS4kaXRlbS5jb2xzKSAtXG4gICAgICAgICAgICB0aGlzLm1hcmdpblxuICAgICAgICApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmdyaWRzdGVyLnByZXZpZXdTdHlsZSgpO1xuICAgICAgfVxuICAgICAgdGhpcy5wdXNoUmVzaXplLmNoZWNrUHVzaEJhY2soKTtcbiAgICAgIHRoaXMucHVzaC5jaGVja1B1c2hCYWNrKCk7XG4gICAgfVxuICAgIHRoaXMuc2V0SXRlbVdpZHRoKHRoaXMud2lkdGgpO1xuICB9O1xuXG4gIHByaXZhdGUgaGFuZGxlTm9ydGhXZXN0ID0gKGU6IE1vdXNlRXZlbnQpOiB2b2lkID0+IHtcbiAgICB0aGlzLmhhbmRsZU5vcnRoKGUpO1xuICAgIHRoaXMuaGFuZGxlV2VzdChlKTtcbiAgfTtcblxuICBwcml2YXRlIGhhbmRsZU5vcnRoRWFzdCA9IChlOiBNb3VzZUV2ZW50KTogdm9pZCA9PiB7XG4gICAgdGhpcy5oYW5kbGVOb3J0aChlKTtcbiAgICB0aGlzLmhhbmRsZUVhc3QoZSk7XG4gIH07XG5cbiAgcHJpdmF0ZSBoYW5kbGVTb3V0aFdlc3QgPSAoZTogTW91c2VFdmVudCk6IHZvaWQgPT4ge1xuICAgIHRoaXMuaGFuZGxlU291dGgoZSk7XG4gICAgdGhpcy5oYW5kbGVXZXN0KGUpO1xuICB9O1xuXG4gIHByaXZhdGUgaGFuZGxlU291dGhFYXN0ID0gKGU6IE1vdXNlRXZlbnQpOiB2b2lkID0+IHtcbiAgICB0aGlzLmhhbmRsZVNvdXRoKGUpO1xuICAgIHRoaXMuaGFuZGxlRWFzdChlKTtcbiAgfTtcblxuICB0b2dnbGUoKTogdm9pZCB7XG4gICAgdGhpcy5yZXNpemVFbmFibGVkID0gdGhpcy5ncmlkc3Rlckl0ZW0uY2FuQmVSZXNpemVkKCk7XG4gICAgdGhpcy5yZXNpemFibGVIYW5kbGVzID0gdGhpcy5ncmlkc3Rlckl0ZW0uZ2V0UmVzaXphYmxlSGFuZGxlcygpO1xuICB9XG5cbiAgZHJhZ1N0YXJ0RGVsYXkoZTogTW91c2VFdmVudCB8IFRvdWNoRXZlbnQpOiB2b2lkIHtcbiAgICBHcmlkc3RlclV0aWxzLmNoZWNrVG91Y2hFdmVudChlKTtcblxuICAgIGlmICghdGhpcy5ncmlkc3Rlci4kb3B0aW9ucy5yZXNpemFibGUuZGVsYXlTdGFydCkge1xuICAgICAgdGhpcy5kcmFnU3RhcnQoZSBhcyBNb3VzZUV2ZW50KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLmRyYWdTdGFydChlIGFzIE1vdXNlRXZlbnQpO1xuICAgICAgY2FuY2VsRHJhZygpO1xuICAgIH0sIHRoaXMuZ3JpZHN0ZXIuJG9wdGlvbnMucmVzaXphYmxlLmRlbGF5U3RhcnQpO1xuXG4gICAgY29uc3Qge1xuICAgICAgY2FuY2VsTW91c2UsXG4gICAgICBjYW5jZWxNb3VzZUxlYXZlLFxuICAgICAgY2FuY2VsT25CbHVyLFxuICAgICAgY2FuY2VsVG91Y2hNb3ZlLFxuICAgICAgY2FuY2VsVG91Y2hFbmQsXG4gICAgICBjYW5jZWxUb3VjaENhbmNlbFxuICAgIH0gPSB0aGlzLnpvbmUucnVuT3V0c2lkZUFuZ3VsYXIoKCkgPT4ge1xuICAgICAgLy8gTm90ZTogYWxsIG9mIHRoZXNlIGV2ZW50cyBhcmUgYmVpbmcgYWRkZWQgd2l0aGluIHRoZSBgPHJvb3Q+YCB6b25lIHNpbmNlIHRoZXkgYWxsXG4gICAgICAvLyBkb24ndCBkbyBhbnkgdmlldyB1cGRhdGVzIGFuZCBkb24ndCByZXF1aXJlIEFuZ3VsYXIgcnVubmluZyBjaGFuZ2UgZGV0ZWN0aW9uLlxuICAgICAgLy8gQWxsIGV2ZW50IGxpc3RlbmVycyBjYWxsIGBjYW5jZWxEcmFnYCBvbmNlIHRoZSBldmVudCBpcyBkaXNwYXRjaGVkLCB0aGUgYGNhbmNlbERyYWdgXG4gICAgICAvLyBpcyByZXNwb25zaWJsZSBvbmx5IGZvciByZW1vdmluZyBldmVudCBsaXN0ZW5lcnMuXG5cbiAgICAgIGNvbnN0IGNhbmNlbE1vdXNlID0gdGhpcy5ncmlkc3Rlckl0ZW0ucmVuZGVyZXIubGlzdGVuKFxuICAgICAgICAnZG9jdW1lbnQnLFxuICAgICAgICAnbW91c2V1cCcsXG4gICAgICAgIGNhbmNlbERyYWdcbiAgICAgICk7XG4gICAgICBjb25zdCBjYW5jZWxNb3VzZUxlYXZlID0gdGhpcy5ncmlkc3Rlckl0ZW0ucmVuZGVyZXIubGlzdGVuKFxuICAgICAgICAnZG9jdW1lbnQnLFxuICAgICAgICAnbW91c2VsZWF2ZScsXG4gICAgICAgIGNhbmNlbERyYWdcbiAgICAgICk7XG4gICAgICBjb25zdCBjYW5jZWxPbkJsdXIgPSB0aGlzLmdyaWRzdGVySXRlbS5yZW5kZXJlci5saXN0ZW4oXG4gICAgICAgICd3aW5kb3cnLFxuICAgICAgICAnYmx1cicsXG4gICAgICAgIGNhbmNlbERyYWdcbiAgICAgICk7XG4gICAgICBjb25zdCBjYW5jZWxUb3VjaE1vdmUgPSB0aGlzLmdyaWRzdGVySXRlbS5yZW5kZXJlci5saXN0ZW4oXG4gICAgICAgICdkb2N1bWVudCcsXG4gICAgICAgICd0b3VjaG1vdmUnLFxuICAgICAgICBjYW5jZWxNb3ZlXG4gICAgICApO1xuICAgICAgY29uc3QgY2FuY2VsVG91Y2hFbmQgPSB0aGlzLmdyaWRzdGVySXRlbS5yZW5kZXJlci5saXN0ZW4oXG4gICAgICAgICdkb2N1bWVudCcsXG4gICAgICAgICd0b3VjaGVuZCcsXG4gICAgICAgIGNhbmNlbERyYWdcbiAgICAgICk7XG4gICAgICBjb25zdCBjYW5jZWxUb3VjaENhbmNlbCA9IHRoaXMuZ3JpZHN0ZXJJdGVtLnJlbmRlcmVyLmxpc3RlbihcbiAgICAgICAgJ2RvY3VtZW50JyxcbiAgICAgICAgJ3RvdWNoY2FuY2VsJyxcbiAgICAgICAgY2FuY2VsRHJhZ1xuICAgICAgKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNhbmNlbE1vdXNlLFxuICAgICAgICBjYW5jZWxNb3VzZUxlYXZlLFxuICAgICAgICBjYW5jZWxPbkJsdXIsXG4gICAgICAgIGNhbmNlbFRvdWNoTW92ZSxcbiAgICAgICAgY2FuY2VsVG91Y2hFbmQsXG4gICAgICAgIGNhbmNlbFRvdWNoQ2FuY2VsXG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gY2FuY2VsTW92ZShldmVudE1vdmU6IE1vdXNlRXZlbnQpOiB2b2lkIHtcbiAgICAgIEdyaWRzdGVyVXRpbHMuY2hlY2tUb3VjaEV2ZW50KGV2ZW50TW92ZSk7XG4gICAgICBpZiAoXG4gICAgICAgIE1hdGguYWJzKGV2ZW50TW92ZS5jbGllbnRYIC0gKGUgYXMgTW91c2VFdmVudCkuY2xpZW50WCkgPiA5IHx8XG4gICAgICAgIE1hdGguYWJzKGV2ZW50TW92ZS5jbGllbnRZIC0gKGUgYXMgTW91c2VFdmVudCkuY2xpZW50WSkgPiA5XG4gICAgICApIHtcbiAgICAgICAgY2FuY2VsRHJhZygpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhbmNlbERyYWcoKTogdm9pZCB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICBjYW5jZWxPbkJsdXIoKTtcbiAgICAgIGNhbmNlbE1vdXNlKCk7XG4gICAgICBjYW5jZWxNb3VzZUxlYXZlKCk7XG4gICAgICBjYW5jZWxUb3VjaE1vdmUoKTtcbiAgICAgIGNhbmNlbFRvdWNoRW5kKCk7XG4gICAgICBjYW5jZWxUb3VjaENhbmNlbCgpO1xuICAgIH1cbiAgfVxuXG4gIHNldEl0ZW1Ub3AodG9wOiBudW1iZXIpOiB2b2lkIHtcbiAgICB0aGlzLmdyaWRzdGVyLmdyaWRSZW5kZXJlci5zZXRDZWxsUG9zaXRpb24oXG4gICAgICB0aGlzLmdyaWRzdGVySXRlbS5yZW5kZXJlcixcbiAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLmVsLFxuICAgICAgdGhpcy5sZWZ0LFxuICAgICAgdG9wXG4gICAgKTtcbiAgfVxuXG4gIHNldEl0ZW1MZWZ0KGxlZnQ6IG51bWJlcik6IHZvaWQge1xuICAgIHRoaXMuZ3JpZHN0ZXIuZ3JpZFJlbmRlcmVyLnNldENlbGxQb3NpdGlvbihcbiAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLnJlbmRlcmVyLFxuICAgICAgdGhpcy5ncmlkc3Rlckl0ZW0uZWwsXG4gICAgICBsZWZ0LFxuICAgICAgdGhpcy50b3BcbiAgICApO1xuICB9XG5cbiAgc2V0SXRlbUhlaWdodChoZWlnaHQ6IG51bWJlcik6IHZvaWQge1xuICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLnJlbmRlcmVyLnNldFN0eWxlKFxuICAgICAgdGhpcy5ncmlkc3Rlckl0ZW0uZWwsXG4gICAgICAnaGVpZ2h0JyxcbiAgICAgIGhlaWdodCArICdweCdcbiAgICApO1xuICB9XG5cbiAgc2V0SXRlbVdpZHRoKHdpZHRoOiBudW1iZXIpOiB2b2lkIHtcbiAgICB0aGlzLmdyaWRzdGVySXRlbS5yZW5kZXJlci5zZXRTdHlsZShcbiAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLmVsLFxuICAgICAgJ3dpZHRoJyxcbiAgICAgIHdpZHRoICsgJ3B4J1xuICAgICk7XG4gIH1cbn1cbiJdfQ==