import { DirTypes } from './gridsterConfig.interface';
import { GridsterPush } from './gridsterPush.service';
import { cancelScroll, scroll } from './gridsterScroll.service';
import { GridsterSwap } from './gridsterSwap.service';
import { GridsterUtils } from './gridsterUtils.service';
const GRIDSTER_ITEM_RESIZABLE_HANDLER_CLASS = 'gridster-item-resizable-handler';
var Direction;
(function (Direction) {
    Direction["UP"] = "UP";
    Direction["DOWN"] = "DOWN";
    Direction["LEFT"] = "LEFT";
    Direction["RIGHT"] = "RIGHT";
})(Direction || (Direction = {}));
export class GridsterDraggable {
    constructor(gridsterItem, gridster, zone) {
        this.zone = zone;
        this.collision = false;
        this.dragMove = (e) => {
            e.stopPropagation();
            e.preventDefault();
            GridsterUtils.checkTouchEvent(e);
            // get the directions of the mouse event
            let directions = this.getDirections(e);
            if (this.gridster.options.enableBoundaryControl) {
                // prevent moving up at the top of gridster
                if (directions.includes(Direction.UP) &&
                    this.gridsterItem.el.getBoundingClientRect().top <
                        this.gridster.el.getBoundingClientRect().top +
                            (this.outerMarginTop ?? this.margin)) {
                    directions = directions.filter(direction => direction != Direction.UP);
                    e = new MouseEvent(e.type, {
                        clientX: e.clientX,
                        clientY: this.lastMouse.clientY
                    });
                }
                // prevent moving left at the leftmost column of gridster
                if (directions.includes(Direction.LEFT) &&
                    this.gridsterItem.el.getBoundingClientRect().left <
                        this.gridster.el.getBoundingClientRect().left +
                            (this.outerMarginLeft ?? this.margin)) {
                    directions = directions.filter(direction => direction != Direction.LEFT);
                    e = new MouseEvent(e.type, {
                        clientX: this.lastMouse.clientX,
                        clientY: e.clientY
                    });
                }
                // prevent moving right at the rightmost column of gridster
                if (directions.includes(Direction.RIGHT) &&
                    this.gridsterItem.el.getBoundingClientRect().right >
                        this.gridster.el.getBoundingClientRect().right -
                            (this.outerMarginRight ?? this.margin)) {
                    directions = directions.filter(direction => direction != Direction.RIGHT);
                    e = new MouseEvent(e.type, {
                        clientX: this.lastMouse.clientX,
                        clientY: e.clientY
                    });
                }
                // prevent moving down at the bottom of gridster
                if (directions.includes(Direction.DOWN) &&
                    this.gridsterItem.el.getBoundingClientRect().bottom >
                        this.gridster.el.getBoundingClientRect().bottom -
                            (this.outerMarginBottom ?? this.margin)) {
                    directions = directions.filter(direction => direction != Direction.DOWN);
                    e = new MouseEvent(e.type, {
                        clientX: e.clientX,
                        clientY: this.lastMouse.clientY
                    });
                }
            }
            // do not change item location when there is no direction to go
            if (directions.length) {
                this.offsetLeft =
                    this.gridster.el.scrollLeft - this.gridster.el.offsetLeft;
                this.offsetTop = this.gridster.el.scrollTop - this.gridster.el.offsetTop;
                scroll(this.gridster, this.left, this.top, this.width, this.height, e, this.lastMouse, this.calculateItemPositionFromMousePosition);
                this.calculateItemPositionFromMousePosition(e);
            }
        };
        this.calculateItemPositionFromMousePosition = (e) => {
            if (this.gridster.options.scale) {
                this.calculateItemPositionWithScale(e, this.gridster.options.scale);
            }
            else {
                this.calculateItemPositionWithoutScale(e);
            }
            this.calculateItemPosition();
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
            this.cancelOnBlur();
            this.mousemove();
            this.mouseup();
            this.mouseleave();
            this.touchmove();
            this.touchend();
            this.touchcancel();
            this.gridsterItem.renderer.removeClass(this.gridsterItem.el, 'gridster-item-moving');
            this.gridster.dragInProgress = false;
            this.gridster.updateGrid();
            this.path = [];
            if (this.gridster.options.draggable &&
                this.gridster.options.draggable.stop) {
                Promise.resolve(this.gridster.options.draggable.stop(this.gridsterItem.item, this.gridsterItem, e)).then(this.makeDrag, this.cancelDrag);
            }
            else {
                this.makeDrag();
            }
            setTimeout(() => {
                if (this.gridster) {
                    this.gridster.movingItem = null;
                    this.gridster.previewStyle(true);
                }
            });
        };
        this.cancelDrag = () => {
            this.gridsterItem.$item.x = this.gridsterItem.item.x || 0;
            this.gridsterItem.$item.y = this.gridsterItem.item.y || 0;
            this.gridsterItem.setSize();
            if (this.push) {
                this.push.restoreItems();
            }
            if (this.swap) {
                this.swap.restoreSwapItem();
            }
            if (this.push) {
                this.push.destroy();
                this.push = null;
            }
            if (this.swap) {
                this.swap.destroy();
                this.swap = null;
            }
        };
        this.makeDrag = () => {
            if (this.gridster.$options.draggable.dropOverItems &&
                this.gridster.options.draggable &&
                this.gridster.options.draggable.dropOverItemsCallback &&
                this.collision &&
                this.collision !== true &&
                this.collision.$item) {
                this.gridster.options.draggable.dropOverItemsCallback(this.gridsterItem.item, this.collision.item, this.gridster);
            }
            this.collision = false;
            this.gridsterItem.setSize();
            this.gridsterItem.checkItemChanges(this.gridsterItem.$item, this.gridsterItem.item);
            if (this.push) {
                this.push.setPushedItems();
            }
            if (this.swap) {
                this.swap.setSwapItem();
            }
            if (this.push) {
                this.push.destroy();
                this.push = null;
            }
            if (this.swap) {
                this.swap.destroy();
                this.swap = null;
            }
        };
        this.dragStartDelay = (e) => {
            const target = e.target;
            if (target.classList.contains(GRIDSTER_ITEM_RESIZABLE_HANDLER_CLASS)) {
                return;
            }
            if (GridsterUtils.checkContentClassForEvent(this.gridster, e)) {
                return;
            }
            GridsterUtils.checkTouchEvent(e);
            if (!this.gridster.$options.draggable.delayStart) {
                this.dragStart(e);
                return;
            }
            const timeout = setTimeout(() => {
                this.dragStart(e);
                cancelDrag();
            }, this.gridster.$options.draggable.delayStart);
            const cancelMouse = this.gridsterItem.renderer.listen('document', 'mouseup', cancelDrag);
            const cancelMouseLeave = this.gridsterItem.renderer.listen('document', 'mouseleave', cancelDrag);
            const cancelOnBlur = this.gridsterItem.renderer.listen('window', 'blur', cancelDrag);
            const cancelTouchMove = this.gridsterItem.renderer.listen('document', 'touchmove', cancelMove);
            const cancelTouchEnd = this.gridsterItem.renderer.listen('document', 'touchend', cancelDrag);
            const cancelTouchCancel = this.gridsterItem.renderer.listen('document', 'touchcancel', cancelDrag);
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
        };
        this.gridsterItem = gridsterItem;
        this.gridster = gridster;
        this.lastMouse = {
            clientX: 0,
            clientY: 0
        };
        this.path = [];
    }
    destroy() {
        if (this.gridster.previewStyle) {
            this.gridster.previewStyle(true);
        }
        this.gridsterItem = this.gridster = this.collision = null;
        if (this.mousedown) {
            this.mousedown();
            this.touchstart();
        }
    }
    dragStart(e) {
        if (e.which && e.which !== 1) {
            return;
        }
        if (this.gridster.options.draggable &&
            this.gridster.options.draggable.start) {
            this.gridster.options.draggable.start(this.gridsterItem.item, this.gridsterItem, e);
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
        this.gridsterItem.renderer.addClass(this.gridsterItem.el, 'gridster-item-moving');
        this.margin = this.gridster.$options.margin;
        this.outerMarginTop = this.gridster.$options.outerMarginTop;
        this.outerMarginRight = this.gridster.$options.outerMarginRight;
        this.outerMarginBottom = this.gridster.$options.outerMarginBottom;
        this.outerMarginLeft = this.gridster.$options.outerMarginLeft;
        this.offsetLeft = this.gridster.el.scrollLeft - this.gridster.el.offsetLeft;
        this.offsetTop = this.gridster.el.scrollTop - this.gridster.el.offsetTop;
        this.left = this.gridsterItem.left - this.margin;
        this.top = this.gridsterItem.top - this.margin;
        this.originalClientX = e.clientX;
        this.originalClientY = e.clientY;
        this.width = this.gridsterItem.width;
        this.height = this.gridsterItem.height;
        if (this.gridster.$options.dirType === DirTypes.RTL) {
            this.diffLeft =
                e.clientX - this.gridster.el.scrollWidth + this.gridsterItem.left;
        }
        else {
            this.diffLeft = e.clientX + this.offsetLeft - this.margin - this.left;
        }
        this.diffTop = e.clientY + this.offsetTop - this.margin - this.top;
        this.gridster.movingItem = this.gridsterItem.$item;
        this.gridster.previewStyle(true);
        this.push = new GridsterPush(this.gridsterItem);
        this.swap = new GridsterSwap(this.gridsterItem);
        this.gridster.dragInProgress = true;
        this.gridster.updateGrid();
        this.path.push({
            x: this.gridsterItem.item.x || 0,
            y: this.gridsterItem.item.y || 0
        });
    }
    calculateItemPositionWithScale(e, scale) {
        if (this.gridster.$options.dirType === DirTypes.RTL) {
            this.left =
                this.gridster.el.scrollWidth -
                    this.originalClientX +
                    (e.clientX - this.originalClientX) / scale +
                    this.diffLeft;
        }
        else {
            this.left =
                this.originalClientX +
                    (e.clientX - this.originalClientX) / scale +
                    this.offsetLeft -
                    this.diffLeft;
        }
        this.top =
            this.originalClientY +
                (e.clientY - this.originalClientY) / scale +
                this.offsetTop -
                this.diffTop;
    }
    calculateItemPositionWithoutScale(e) {
        if (this.gridster.$options.dirType === DirTypes.RTL) {
            this.left = this.gridster.el.scrollWidth - e.clientX + this.diffLeft;
        }
        else {
            this.left = e.clientX + this.offsetLeft - this.diffLeft;
        }
        this.top = e.clientY + this.offsetTop - this.diffTop;
    }
    calculateItemPosition() {
        this.gridster.movingItem = this.gridsterItem.$item;
        this.positionX = this.gridster.pixelsToPositionX(this.left, Math.round);
        this.positionY = this.gridster.pixelsToPositionY(this.top, Math.round);
        this.positionXBackup = this.gridsterItem.$item.x;
        this.positionYBackup = this.gridsterItem.$item.y;
        this.gridsterItem.$item.x = this.positionX;
        if (this.gridster.checkGridCollision(this.gridsterItem.$item)) {
            this.gridsterItem.$item.x = this.positionXBackup;
        }
        this.gridsterItem.$item.y = this.positionY;
        if (this.gridster.checkGridCollision(this.gridsterItem.$item)) {
            this.gridsterItem.$item.y = this.positionYBackup;
        }
        this.gridster.gridRenderer.setCellPosition(this.gridsterItem.renderer, this.gridsterItem.el, this.left, this.top);
        if (this.positionXBackup !== this.gridsterItem.$item.x ||
            this.positionYBackup !== this.gridsterItem.$item.y) {
            const lastPosition = this.path[this.path.length - 1];
            let direction = '';
            if (lastPosition.x < this.gridsterItem.$item.x) {
                direction = this.push.fromWest;
            }
            else if (lastPosition.x > this.gridsterItem.$item.x) {
                direction = this.push.fromEast;
            }
            else if (lastPosition.y < this.gridsterItem.$item.y) {
                direction = this.push.fromNorth;
            }
            else if (lastPosition.y > this.gridsterItem.$item.y) {
                direction = this.push.fromSouth;
            }
            this.push.pushItems(direction, this.gridster.$options.disablePushOnDrag);
            this.swap.swapItems();
            this.collision = this.gridster.checkCollision(this.gridsterItem.$item);
            if (this.collision) {
                this.gridsterItem.$item.x = this.positionXBackup;
                this.gridsterItem.$item.y = this.positionYBackup;
                if (this.gridster.$options.draggable.dropOverItems &&
                    this.collision !== true &&
                    this.collision.$item) {
                    this.gridster.movingItem = null;
                }
            }
            else {
                this.path.push({
                    x: this.gridsterItem.$item.x,
                    y: this.gridsterItem.$item.y
                });
            }
            this.push.checkPushBack();
        }
        else {
            // reset the collision when you drag and drop on an adjacent cell that is not empty
            // and go back to the cell you were in from the beginning,
            // this is to prevent `dropOverItemsCallback'
            this.collision = false;
        }
        this.gridster.previewStyle(true);
    }
    toggle() {
        const enableDrag = this.gridsterItem.canBeDragged();
        if (!this.enabled && enableDrag) {
            this.enabled = !this.enabled;
            this.mousedown = this.gridsterItem.renderer.listen(this.gridsterItem.el, 'mousedown', this.dragStartDelay);
            this.touchstart = this.gridsterItem.renderer.listen(this.gridsterItem.el, 'touchstart', this.dragStartDelay);
        }
        else if (this.enabled && !enableDrag) {
            this.enabled = !this.enabled;
            this.mousedown();
            this.touchstart();
        }
    }
    /**
     * Returns the list of directions for given mouse event
     * @param e Mouse event
     * */
    getDirections(e) {
        const directions = [];
        if (this.lastMouse.clientX === 0 && this.lastMouse.clientY === 0) {
            this.lastMouse.clientY = e.clientY;
            this.lastMouse.clientX = e.clientX;
        }
        if (this.lastMouse.clientY > e.clientY) {
            directions.push(Direction.UP);
        }
        if (this.lastMouse.clientY < e.clientY) {
            directions.push(Direction.DOWN);
        }
        if (this.lastMouse.clientX < e.clientX) {
            directions.push(Direction.RIGHT);
        }
        if (this.lastMouse.clientX > e.clientX) {
            directions.push(Direction.LEFT);
        }
        return directions;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JpZHN0ZXJEcmFnZ2FibGUuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Byb2plY3RzL2FuZ3VsYXItZ3JpZHN0ZXIyL3NyYy9saWIvZ3JpZHN0ZXJEcmFnZ2FibGUuc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFdEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFaEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUV4RCxNQUFNLHFDQUFxQyxHQUFHLGlDQUFpQyxDQUFDO0FBRWhGLElBQUssU0FLSjtBQUxELFdBQUssU0FBUztJQUNaLHNCQUFTLENBQUE7SUFDVCwwQkFBYSxDQUFBO0lBQ2IsMEJBQWEsQ0FBQTtJQUNiLDRCQUFlLENBQUE7QUFDakIsQ0FBQyxFQUxJLFNBQVMsS0FBVCxTQUFTLFFBS2I7QUFFRCxNQUFNLE9BQU8saUJBQWlCO0lBeUM1QixZQUNFLFlBQTRDLEVBQzVDLFFBQW9DLEVBQzVCLElBQVk7UUFBWixTQUFJLEdBQUosSUFBSSxDQUFRO1FBTHRCLGNBQVMsR0FBNkMsS0FBSyxDQUFDO1FBdUg1RCxhQUFRLEdBQUcsQ0FBQyxDQUFhLEVBQVEsRUFBRTtZQUNqQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDcEIsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ25CLGFBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFakMsd0NBQXdDO1lBQ3hDLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFdkMs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QUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztTQUNuQjtJQUNILENBQUM7SUF1RUQ7OztTQUdLO0lBQ0csYUFBYSxDQUFDLENBQWE7UUFDakMsTUFBTSxVQUFVLEdBQWEsRUFBRSxDQUFDO1FBQ2hDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxLQUFLLENBQUMsRUFBRTtZQUNoRSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQ25DLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUM7U0FDcEM7UUFDRCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUU7WUFDdEMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDL0I7UUFDRCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUU7WUFDdEMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDakM7UUFDRCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUU7WUFDdEMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDbEM7UUFDRCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUU7WUFDdEMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDakM7UUFDRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZ1pvbmUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IEdyaWRzdGVyQ29tcG9uZW50SW50ZXJmYWNlIH0gZnJvbSAnLi9ncmlkc3Rlci5pbnRlcmZhY2UnO1xuaW1wb3J0IHsgRGlyVHlwZXMgfSBmcm9tICcuL2dyaWRzdGVyQ29uZmlnLmludGVyZmFjZSc7XG5pbXBvcnQgeyBHcmlkc3Rlckl0ZW1Db21wb25lbnRJbnRlcmZhY2UgfSBmcm9tICcuL2dyaWRzdGVySXRlbS5pbnRlcmZhY2UnO1xuaW1wb3J0IHsgR3JpZHN0ZXJQdXNoIH0gZnJvbSAnLi9ncmlkc3RlclB1c2guc2VydmljZSc7XG5pbXBvcnQgeyBjYW5jZWxTY3JvbGwsIHNjcm9sbCB9IGZyb20gJy4vZ3JpZHN0ZXJTY3JvbGwuc2VydmljZSc7XG5cbmltcG9ydCB7IEdyaWRzdGVyU3dhcCB9IGZyb20gJy4vZ3JpZHN0ZXJTd2FwLnNlcnZpY2UnO1xuaW1wb3J0IHsgR3JpZHN0ZXJVdGlscyB9IGZyb20gJy4vZ3JpZHN0ZXJVdGlscy5zZXJ2aWNlJztcblxuY29uc3QgR1JJRFNURVJfSVRFTV9SRVNJWkFCTEVfSEFORExFUl9DTEFTUyA9ICdncmlkc3Rlci1pdGVtLXJlc2l6YWJsZS1oYW5kbGVyJztcblxuZW51bSBEaXJlY3Rpb24ge1xuICBVUCA9ICdVUCcsXG4gIERPV04gPSAnRE9XTicsXG4gIExFRlQgPSAnTEVGVCcsXG4gIFJJR0hUID0gJ1JJR0hUJ1xufVxuXG5leHBvcnQgY2xhc3MgR3JpZHN0ZXJEcmFnZ2FibGUge1xuICBncmlkc3Rlckl0ZW06IEdyaWRzdGVySXRlbUNvbXBvbmVudEludGVyZmFjZTtcbiAgZ3JpZHN0ZXI6IEdyaWRzdGVyQ29tcG9uZW50SW50ZXJmYWNlO1xuICBsYXN0TW91c2U6IHtcbiAgICBjbGllbnRYOiBudW1iZXI7XG4gICAgY2xpZW50WTogbnVtYmVyO1xuICB9O1xuICBvZmZzZXRMZWZ0OiBudW1iZXI7XG4gIG9mZnNldFRvcDogbnVtYmVyO1xuICBtYXJnaW46IG51bWJlcjtcbiAgb3V0ZXJNYXJnaW5Ub3A6IG51bWJlciB8IG51bGw7XG4gIG91dGVyTWFyZ2luUmlnaHQ6IG51bWJlciB8IG51bGw7XG4gIG91dGVyTWFyZ2luQm90dG9tOiBudW1iZXIgfCBudWxsO1xuICBvdXRlck1hcmdpbkxlZnQ6IG51bWJlciB8IG51bGw7XG4gIGRpZmZUb3A6IG51bWJlcjtcbiAgZGlmZkxlZnQ6IG51bWJlcjtcbiAgb3JpZ2luYWxDbGllbnRYOiBudW1iZXI7XG4gIG9yaWdpbmFsQ2xpZW50WTogbnVtYmVyO1xuICB0b3A6IG51bWJlcjtcbiAgbGVmdDogbnVtYmVyO1xuICBoZWlnaHQ6IG51bWJlcjtcbiAgd2lkdGg6IG51bWJlcjtcbiAgcG9zaXRpb25YOiBudW1iZXI7XG4gIHBvc2l0aW9uWTogbnVtYmVyO1xuICBwb3NpdGlvblhCYWNrdXA6IG51bWJlcjtcbiAgcG9zaXRpb25ZQmFja3VwOiBudW1iZXI7XG4gIGVuYWJsZWQ6IGJvb2xlYW47XG4gIG1vdXNlbW92ZTogKCkgPT4gdm9pZDtcbiAgbW91c2V1cDogKCkgPT4gdm9pZDtcbiAgbW91c2VsZWF2ZTogKCkgPT4gdm9pZDtcbiAgY2FuY2VsT25CbHVyOiAoKSA9PiB2b2lkO1xuICB0b3VjaG1vdmU6ICgpID0+IHZvaWQ7XG4gIHRvdWNoZW5kOiAoKSA9PiB2b2lkO1xuICB0b3VjaGNhbmNlbDogKCkgPT4gdm9pZDtcbiAgbW91c2Vkb3duOiAoKSA9PiB2b2lkO1xuICB0b3VjaHN0YXJ0OiAoKSA9PiB2b2lkO1xuICBwdXNoOiBHcmlkc3RlclB1c2g7XG4gIHN3YXA6IEdyaWRzdGVyU3dhcDtcbiAgcGF0aDogQXJyYXk8eyB4OiBudW1iZXI7IHk6IG51bWJlciB9PjtcbiAgY29sbGlzaW9uOiBHcmlkc3Rlckl0ZW1Db21wb25lbnRJbnRlcmZhY2UgfCBib29sZWFuID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgZ3JpZHN0ZXJJdGVtOiBHcmlkc3Rlckl0ZW1Db21wb25lbnRJbnRlcmZhY2UsXG4gICAgZ3JpZHN0ZXI6IEdyaWRzdGVyQ29tcG9uZW50SW50ZXJmYWNlLFxuICAgIHByaXZhdGUgem9uZTogTmdab25lXG4gICkge1xuICAgIHRoaXMuZ3JpZHN0ZXJJdGVtID0gZ3JpZHN0ZXJJdGVtO1xuICAgIHRoaXMuZ3JpZHN0ZXIgPSBncmlkc3RlcjtcbiAgICB0aGlzLmxhc3RNb3VzZSA9IHtcbiAgICAgIGNsaWVudFg6IDAsXG4gICAgICBjbGllbnRZOiAwXG4gICAgfTtcbiAgICB0aGlzLnBhdGggPSBbXTtcbiAgfVxuXG4gIGRlc3Ryb3koKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZ3JpZHN0ZXIucHJldmlld1N0eWxlKSB7XG4gICAgICB0aGlzLmdyaWRzdGVyLnByZXZpZXdTdHlsZSh0cnVlKTtcbiAgICB9XG4gICAgdGhpcy5ncmlkc3Rlckl0ZW0gPSB0aGlzLmdyaWRzdGVyID0gdGhpcy5jb2xsaXNpb24gPSBudWxsITtcbiAgICBpZiAodGhpcy5tb3VzZWRvd24pIHtcbiAgICAgIHRoaXMubW91c2Vkb3duKCk7XG4gICAgICB0aGlzLnRvdWNoc3RhcnQoKTtcbiAgICB9XG4gIH1cblxuICBkcmFnU3RhcnQoZTogTW91c2VFdmVudCk6IHZvaWQge1xuICAgIGlmIChlLndoaWNoICYmIGUud2hpY2ggIT09IDEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoXG4gICAgICB0aGlzLmdyaWRzdGVyLm9wdGlvbnMuZHJhZ2dhYmxlICYmXG4gICAgICB0aGlzLmdyaWRzdGVyLm9wdGlvbnMuZHJhZ2dhYmxlLnN0YXJ0XG4gICAgKSB7XG4gICAgICB0aGlzLmdyaWRzdGVyLm9wdGlvbnMuZHJhZ2dhYmxlLnN0YXJ0KFxuICAgICAgICB0aGlzLmdyaWRzdGVySXRlbS5pdGVtLFxuICAgICAgICB0aGlzLmdyaWRzdGVySXRlbSxcbiAgICAgICAgZVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIHRoaXMuem9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiB7XG4gICAgICB0aGlzLm1vdXNlbW92ZSA9IHRoaXMuZ3JpZHN0ZXJJdGVtLnJlbmRlcmVyLmxpc3RlbihcbiAgICAgICAgJ2RvY3VtZW50JyxcbiAgICAgICAgJ21vdXNlbW92ZScsXG4gICAgICAgIHRoaXMuZHJhZ01vdmVcbiAgICAgICk7XG4gICAgICB0aGlzLnRvdWNobW92ZSA9IHRoaXMuZ3JpZHN0ZXIucmVuZGVyZXIubGlzdGVuKFxuICAgICAgICB0aGlzLmdyaWRzdGVyLmVsLFxuICAgICAgICAndG91Y2htb3ZlJyxcbiAgICAgICAgdGhpcy5kcmFnTW92ZVxuICAgICAgKTtcbiAgICB9KTtcbiAgICB0aGlzLm1vdXNldXAgPSB0aGlzLmdyaWRzdGVySXRlbS5yZW5kZXJlci5saXN0ZW4oXG4gICAgICAnZG9jdW1lbnQnLFxuICAgICAgJ21vdXNldXAnLFxuICAgICAgdGhpcy5kcmFnU3RvcFxuICAgICk7XG4gICAgdGhpcy5tb3VzZWxlYXZlID0gdGhpcy5ncmlkc3Rlckl0ZW0ucmVuZGVyZXIubGlzdGVuKFxuICAgICAgJ2RvY3VtZW50JyxcbiAgICAgICdtb3VzZWxlYXZlJyxcbiAgICAgIHRoaXMuZHJhZ1N0b3BcbiAgICApO1xuICAgIHRoaXMuY2FuY2VsT25CbHVyID0gdGhpcy5ncmlkc3Rlckl0ZW0ucmVuZGVyZXIubGlzdGVuKFxuICAgICAgJ3dpbmRvdycsXG4gICAgICAnYmx1cicsXG4gICAgICB0aGlzLmRyYWdTdG9wXG4gICAgKTtcbiAgICB0aGlzLnRvdWNoZW5kID0gdGhpcy5ncmlkc3Rlckl0ZW0ucmVuZGVyZXIubGlzdGVuKFxuICAgICAgJ2RvY3VtZW50JyxcbiAgICAgICd0b3VjaGVuZCcsXG4gICAgICB0aGlzLmRyYWdTdG9wXG4gICAgKTtcbiAgICB0aGlzLnRvdWNoY2FuY2VsID0gdGhpcy5ncmlkc3Rlckl0ZW0ucmVuZGVyZXIubGlzdGVuKFxuICAgICAgJ2RvY3VtZW50JyxcbiAgICAgICd0b3VjaGNhbmNlbCcsXG4gICAgICB0aGlzLmRyYWdTdG9wXG4gICAgKTtcbiAgICB0aGlzLmdyaWRzdGVySXRlbS5yZW5kZXJlci5hZGRDbGFzcyhcbiAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLmVsLFxuICAgICAgJ2dyaWRzdGVyLWl0ZW0tbW92aW5nJ1xuICAgICk7XG4gICAgdGhpcy5tYXJnaW4gPSB0aGlzLmdyaWRzdGVyLiRvcHRpb25zLm1hcmdpbjtcbiAgICB0aGlzLm91dGVyTWFyZ2luVG9wID0gdGhpcy5ncmlkc3Rlci4kb3B0aW9ucy5vdXRlck1hcmdpblRvcDtcbiAgICB0aGlzLm91dGVyTWFyZ2luUmlnaHQgPSB0aGlzLmdyaWRzdGVyLiRvcHRpb25zLm91dGVyTWFyZ2luUmlnaHQ7XG4gICAgdGhpcy5vdXRlck1hcmdpbkJvdHRvbSA9IHRoaXMuZ3JpZHN0ZXIuJG9wdGlvbnMub3V0ZXJNYXJnaW5Cb3R0b207XG4gICAgdGhpcy5vdXRlck1hcmdpbkxlZnQgPSB0aGlzLmdyaWRzdGVyLiRvcHRpb25zLm91dGVyTWFyZ2luTGVmdDtcbiAgICB0aGlzLm9mZnNldExlZnQgPSB0aGlzLmdyaWRzdGVyLmVsLnNjcm9sbExlZnQgLSB0aGlzLmdyaWRzdGVyLmVsLm9mZnNldExlZnQ7XG4gICAgdGhpcy5vZmZzZXRUb3AgPSB0aGlzLmdyaWRzdGVyLmVsLnNjcm9sbFRvcCAtIHRoaXMuZ3JpZHN0ZXIuZWwub2Zmc2V0VG9wO1xuICAgIHRoaXMubGVmdCA9IHRoaXMuZ3JpZHN0ZXJJdGVtLmxlZnQgLSB0aGlzLm1hcmdpbjtcbiAgICB0aGlzLnRvcCA9IHRoaXMuZ3JpZHN0ZXJJdGVtLnRvcCAtIHRoaXMubWFyZ2luO1xuICAgIHRoaXMub3JpZ2luYWxDbGllbnRYID0gZS5jbGllbnRYO1xuICAgIHRoaXMub3JpZ2luYWxDbGllbnRZID0gZS5jbGllbnRZO1xuICAgIHRoaXMud2lkdGggPSB0aGlzLmdyaWRzdGVySXRlbS53aWR0aDtcbiAgICB0aGlzLmhlaWdodCA9IHRoaXMuZ3JpZHN0ZXJJdGVtLmhlaWdodDtcbiAgICBpZiAodGhpcy5ncmlkc3Rlci4kb3B0aW9ucy5kaXJUeXBlID09PSBEaXJUeXBlcy5SVEwpIHtcbiAgICAgIHRoaXMuZGlmZkxlZnQgPVxuICAgICAgICBlLmNsaWVudFggLSB0aGlzLmdyaWRzdGVyLmVsLnNjcm9sbFdpZHRoICsgdGhpcy5ncmlkc3Rlckl0ZW0ubGVmdDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kaWZmTGVmdCA9IGUuY2xpZW50WCArIHRoaXMub2Zmc2V0TGVmdCAtIHRoaXMubWFyZ2luIC0gdGhpcy5sZWZ0O1xuICAgIH1cbiAgICB0aGlzLmRpZmZUb3AgPSBlLmNsaWVudFkgKyB0aGlzLm9mZnNldFRvcCAtIHRoaXMubWFyZ2luIC0gdGhpcy50b3A7XG4gICAgdGhpcy5ncmlkc3Rlci5tb3ZpbmdJdGVtID0gdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW07XG4gICAgdGhpcy5ncmlkc3Rlci5wcmV2aWV3U3R5bGUodHJ1ZSk7XG4gICAgdGhpcy5wdXNoID0gbmV3IEdyaWRzdGVyUHVzaCh0aGlzLmdyaWRzdGVySXRlbSk7XG4gICAgdGhpcy5zd2FwID0gbmV3IEdyaWRzdGVyU3dhcCh0aGlzLmdyaWRzdGVySXRlbSk7XG4gICAgdGhpcy5ncmlkc3Rlci5kcmFnSW5Qcm9ncmVzcyA9IHRydWU7XG4gICAgdGhpcy5ncmlkc3Rlci51cGRhdGVHcmlkKCk7XG4gICAgdGhpcy5wYXRoLnB1c2goe1xuICAgICAgeDogdGhpcy5ncmlkc3Rlckl0ZW0uaXRlbS54IHx8IDAsXG4gICAgICB5OiB0aGlzLmdyaWRzdGVySXRlbS5pdGVtLnkgfHwgMFxuICAgIH0pO1xuICB9XG5cbiAgZHJhZ01vdmUgPSAoZTogTW91c2VFdmVudCk6IHZvaWQgPT4ge1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIEdyaWRzdGVyVXRpbHMuY2hlY2tUb3VjaEV2ZW50KGUpO1xuXG4gICAgLy8gZ2V0IHRoZSBkaXJlY3Rpb25zIG9mIHRoZSBtb3VzZSBldmVudFxuICAgIGxldCBkaXJlY3Rpb25zID0gdGhpcy5nZXREaXJlY3Rpb25zKGUpO1xuXG4gICAgaWYgKHRoaXMuZ3JpZHN0ZXIub3B0aW9ucy5lbmFibGVCb3VuZGFyeUNvbnRyb2wpIHtcbiAgICAgIC8vIHByZXZlbnQgbW92aW5nIHVwIGF0IHRoZSB0b3Agb2YgZ3JpZHN0ZXJcbiAgICAgIGlmIChcbiAgICAgICAgZGlyZWN0aW9ucy5pbmNsdWRlcyhEaXJlY3Rpb24uVVApICYmXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLmVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcCA8XG4gICAgICAgICAgdGhpcy5ncmlkc3Rlci5lbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3AgK1xuICAgICAgICAgICAgKHRoaXMub3V0ZXJNYXJnaW5Ub3AgPz8gdGhpcy5tYXJnaW4pXG4gICAgICApIHtcbiAgICAgICAgZGlyZWN0aW9ucyA9IGRpcmVjdGlvbnMuZmlsdGVyKGRpcmVjdGlvbiA9PiBkaXJlY3Rpb24gIT0gRGlyZWN0aW9uLlVQKTtcbiAgICAgICAgZSA9IG5ldyBNb3VzZUV2ZW50KGUudHlwZSwge1xuICAgICAgICAgIGNsaWVudFg6IGUuY2xpZW50WCxcbiAgICAgICAgICBjbGllbnRZOiB0aGlzLmxhc3RNb3VzZS5jbGllbnRZXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgLy8gcHJldmVudCBtb3ZpbmcgbGVmdCBhdCB0aGUgbGVmdG1vc3QgY29sdW1uIG9mIGdyaWRzdGVyXG4gICAgICBpZiAoXG4gICAgICAgIGRpcmVjdGlvbnMuaW5jbHVkZXMoRGlyZWN0aW9uLkxFRlQpICYmXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLmVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmxlZnQgPFxuICAgICAgICAgIHRoaXMuZ3JpZHN0ZXIuZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkubGVmdCArXG4gICAgICAgICAgICAodGhpcy5vdXRlck1hcmdpbkxlZnQgPz8gdGhpcy5tYXJnaW4pXG4gICAgICApIHtcbiAgICAgICAgZGlyZWN0aW9ucyA9IGRpcmVjdGlvbnMuZmlsdGVyKFxuICAgICAgICAgIGRpcmVjdGlvbiA9PiBkaXJlY3Rpb24gIT0gRGlyZWN0aW9uLkxFRlRcbiAgICAgICAgKTtcbiAgICAgICAgZSA9IG5ldyBNb3VzZUV2ZW50KGUudHlwZSwge1xuICAgICAgICAgIGNsaWVudFg6IHRoaXMubGFzdE1vdXNlLmNsaWVudFgsXG4gICAgICAgICAgY2xpZW50WTogZS5jbGllbnRZXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgLy8gcHJldmVudCBtb3ZpbmcgcmlnaHQgYXQgdGhlIHJpZ2h0bW9zdCBjb2x1bW4gb2YgZ3JpZHN0ZXJcbiAgICAgIGlmIChcbiAgICAgICAgZGlyZWN0aW9ucy5pbmNsdWRlcyhEaXJlY3Rpb24uUklHSFQpICYmXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLmVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnJpZ2h0ID5cbiAgICAgICAgICB0aGlzLmdyaWRzdGVyLmVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnJpZ2h0IC1cbiAgICAgICAgICAgICh0aGlzLm91dGVyTWFyZ2luUmlnaHQgPz8gdGhpcy5tYXJnaW4pXG4gICAgICApIHtcbiAgICAgICAgZGlyZWN0aW9ucyA9IGRpcmVjdGlvbnMuZmlsdGVyKFxuICAgICAgICAgIGRpcmVjdGlvbiA9PiBkaXJlY3Rpb24gIT0gRGlyZWN0aW9uLlJJR0hUXG4gICAgICAgICk7XG4gICAgICAgIGUgPSBuZXcgTW91c2VFdmVudChlLnR5cGUsIHtcbiAgICAgICAgICBjbGllbnRYOiB0aGlzLmxhc3RNb3VzZS5jbGllbnRYLFxuICAgICAgICAgIGNsaWVudFk6IGUuY2xpZW50WVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIC8vIHByZXZlbnQgbW92aW5nIGRvd24gYXQgdGhlIGJvdHRvbSBvZiBncmlkc3RlclxuICAgICAgaWYgKFxuICAgICAgICBkaXJlY3Rpb25zLmluY2x1ZGVzKERpcmVjdGlvbi5ET1dOKSAmJlxuICAgICAgICB0aGlzLmdyaWRzdGVySXRlbS5lbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5ib3R0b20gPlxuICAgICAgICAgIHRoaXMuZ3JpZHN0ZXIuZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuYm90dG9tIC0gXG4gICAgICAgICAgICAodGhpcy5vdXRlck1hcmdpbkJvdHRvbSA/PyB0aGlzLm1hcmdpbilcbiAgICAgICkge1xuICAgICAgICBkaXJlY3Rpb25zID0gZGlyZWN0aW9ucy5maWx0ZXIoXG4gICAgICAgICAgZGlyZWN0aW9uID0+IGRpcmVjdGlvbiAhPSBEaXJlY3Rpb24uRE9XTlxuICAgICAgICApO1xuICAgICAgICBlID0gbmV3IE1vdXNlRXZlbnQoZS50eXBlLCB7XG4gICAgICAgICAgY2xpZW50WDogZS5jbGllbnRYLFxuICAgICAgICAgIGNsaWVudFk6IHRoaXMubGFzdE1vdXNlLmNsaWVudFlcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZG8gbm90IGNoYW5nZSBpdGVtIGxvY2F0aW9uIHdoZW4gdGhlcmUgaXMgbm8gZGlyZWN0aW9uIHRvIGdvXG4gICAgaWYgKGRpcmVjdGlvbnMubGVuZ3RoKSB7XG4gICAgICB0aGlzLm9mZnNldExlZnQgPVxuICAgICAgICB0aGlzLmdyaWRzdGVyLmVsLnNjcm9sbExlZnQgLSB0aGlzLmdyaWRzdGVyLmVsLm9mZnNldExlZnQ7XG4gICAgICB0aGlzLm9mZnNldFRvcCA9IHRoaXMuZ3JpZHN0ZXIuZWwuc2Nyb2xsVG9wIC0gdGhpcy5ncmlkc3Rlci5lbC5vZmZzZXRUb3A7XG4gICAgICBzY3JvbGwoXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXIsXG4gICAgICAgIHRoaXMubGVmdCxcbiAgICAgICAgdGhpcy50b3AsXG4gICAgICAgIHRoaXMud2lkdGgsXG4gICAgICAgIHRoaXMuaGVpZ2h0LFxuICAgICAgICBlLFxuICAgICAgICB0aGlzLmxhc3RNb3VzZSxcbiAgICAgICAgdGhpcy5jYWxjdWxhdGVJdGVtUG9zaXRpb25Gcm9tTW91c2VQb3NpdGlvblxuICAgICAgKTtcblxuICAgICAgdGhpcy5jYWxjdWxhdGVJdGVtUG9zaXRpb25Gcm9tTW91c2VQb3NpdGlvbihlKTtcbiAgICB9XG4gIH07XG5cbiAgY2FsY3VsYXRlSXRlbVBvc2l0aW9uRnJvbU1vdXNlUG9zaXRpb24gPSAoZTogTW91c2VFdmVudCk6IHZvaWQgPT4ge1xuICAgIGlmICh0aGlzLmdyaWRzdGVyLm9wdGlvbnMuc2NhbGUpIHtcbiAgICAgIHRoaXMuY2FsY3VsYXRlSXRlbVBvc2l0aW9uV2l0aFNjYWxlKGUsIHRoaXMuZ3JpZHN0ZXIub3B0aW9ucy5zY2FsZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY2FsY3VsYXRlSXRlbVBvc2l0aW9uV2l0aG91dFNjYWxlKGUpO1xuICAgIH1cbiAgICB0aGlzLmNhbGN1bGF0ZUl0ZW1Qb3NpdGlvbigpO1xuICAgIHRoaXMubGFzdE1vdXNlLmNsaWVudFggPSBlLmNsaWVudFg7XG4gICAgdGhpcy5sYXN0TW91c2UuY2xpZW50WSA9IGUuY2xpZW50WTtcbiAgICB0aGlzLnpvbmUucnVuKCgpID0+IHtcbiAgICAgIHRoaXMuZ3JpZHN0ZXIudXBkYXRlR3JpZCgpO1xuICAgIH0pO1xuICB9O1xuXG4gIGNhbGN1bGF0ZUl0ZW1Qb3NpdGlvbldpdGhTY2FsZShlOiBNb3VzZUV2ZW50LCBzY2FsZTogbnVtYmVyKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZ3JpZHN0ZXIuJG9wdGlvbnMuZGlyVHlwZSA9PT0gRGlyVHlwZXMuUlRMKSB7XG4gICAgICB0aGlzLmxlZnQgPVxuICAgICAgICB0aGlzLmdyaWRzdGVyLmVsLnNjcm9sbFdpZHRoIC1cbiAgICAgICAgdGhpcy5vcmlnaW5hbENsaWVudFggK1xuICAgICAgICAoZS5jbGllbnRYIC0gdGhpcy5vcmlnaW5hbENsaWVudFgpIC8gc2NhbGUgK1xuICAgICAgICB0aGlzLmRpZmZMZWZ0O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxlZnQgPVxuICAgICAgICB0aGlzLm9yaWdpbmFsQ2xpZW50WCArXG4gICAgICAgIChlLmNsaWVudFggLSB0aGlzLm9yaWdpbmFsQ2xpZW50WCkgLyBzY2FsZSArXG4gICAgICAgIHRoaXMub2Zmc2V0TGVmdCAtXG4gICAgICAgIHRoaXMuZGlmZkxlZnQ7XG4gICAgfVxuICAgIHRoaXMudG9wID1cbiAgICAgIHRoaXMub3JpZ2luYWxDbGllbnRZICtcbiAgICAgIChlLmNsaWVudFkgLSB0aGlzLm9yaWdpbmFsQ2xpZW50WSkgLyBzY2FsZSArXG4gICAgICB0aGlzLm9mZnNldFRvcCAtXG4gICAgICB0aGlzLmRpZmZUb3A7XG4gIH1cblxuICBjYWxjdWxhdGVJdGVtUG9zaXRpb25XaXRob3V0U2NhbGUoZTogTW91c2VFdmVudCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmdyaWRzdGVyLiRvcHRpb25zLmRpclR5cGUgPT09IERpclR5cGVzLlJUTCkge1xuICAgICAgdGhpcy5sZWZ0ID0gdGhpcy5ncmlkc3Rlci5lbC5zY3JvbGxXaWR0aCAtIGUuY2xpZW50WCArIHRoaXMuZGlmZkxlZnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubGVmdCA9IGUuY2xpZW50WCArIHRoaXMub2Zmc2V0TGVmdCAtIHRoaXMuZGlmZkxlZnQ7XG4gICAgfVxuXG4gICAgdGhpcy50b3AgPSBlLmNsaWVudFkgKyB0aGlzLm9mZnNldFRvcCAtIHRoaXMuZGlmZlRvcDtcbiAgfVxuXG4gIGRyYWdTdG9wID0gKGU6IE1vdXNlRXZlbnQpOiB2b2lkID0+IHtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGNhbmNlbFNjcm9sbCgpO1xuICAgIHRoaXMuY2FuY2VsT25CbHVyKCk7XG4gICAgdGhpcy5tb3VzZW1vdmUoKTtcbiAgICB0aGlzLm1vdXNldXAoKTtcbiAgICB0aGlzLm1vdXNlbGVhdmUoKTtcbiAgICB0aGlzLnRvdWNobW92ZSgpO1xuICAgIHRoaXMudG91Y2hlbmQoKTtcbiAgICB0aGlzLnRvdWNoY2FuY2VsKCk7XG4gICAgdGhpcy5ncmlkc3Rlckl0ZW0ucmVuZGVyZXIucmVtb3ZlQ2xhc3MoXG4gICAgICB0aGlzLmdyaWRzdGVySXRlbS5lbCxcbiAgICAgICdncmlkc3Rlci1pdGVtLW1vdmluZydcbiAgICApO1xuICAgIHRoaXMuZ3JpZHN0ZXIuZHJhZ0luUHJvZ3Jlc3MgPSBmYWxzZTtcbiAgICB0aGlzLmdyaWRzdGVyLnVwZGF0ZUdyaWQoKTtcbiAgICB0aGlzLnBhdGggPSBbXTtcbiAgICBpZiAoXG4gICAgICB0aGlzLmdyaWRzdGVyLm9wdGlvbnMuZHJhZ2dhYmxlICYmXG4gICAgICB0aGlzLmdyaWRzdGVyLm9wdGlvbnMuZHJhZ2dhYmxlLnN0b3BcbiAgICApIHtcbiAgICAgIFByb21pc2UucmVzb2x2ZShcbiAgICAgICAgdGhpcy5ncmlkc3Rlci5vcHRpb25zLmRyYWdnYWJsZS5zdG9wKFxuICAgICAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLml0ZW0sXG4gICAgICAgICAgdGhpcy5ncmlkc3Rlckl0ZW0sXG4gICAgICAgICAgZVxuICAgICAgICApXG4gICAgICApLnRoZW4odGhpcy5tYWtlRHJhZywgdGhpcy5jYW5jZWxEcmFnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5tYWtlRHJhZygpO1xuICAgIH1cbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGlmICh0aGlzLmdyaWRzdGVyKSB7XG4gICAgICAgIHRoaXMuZ3JpZHN0ZXIubW92aW5nSXRlbSA9IG51bGw7XG4gICAgICAgIHRoaXMuZ3JpZHN0ZXIucHJldmlld1N0eWxlKHRydWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIGNhbmNlbERyYWcgPSAoKTogdm9pZCA9PiB7XG4gICAgdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0ueCA9IHRoaXMuZ3JpZHN0ZXJJdGVtLml0ZW0ueCB8fCAwO1xuICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtLnkgPSB0aGlzLmdyaWRzdGVySXRlbS5pdGVtLnkgfHwgMDtcbiAgICB0aGlzLmdyaWRzdGVySXRlbS5zZXRTaXplKCk7XG4gICAgaWYgKHRoaXMucHVzaCkge1xuICAgICAgdGhpcy5wdXNoLnJlc3RvcmVJdGVtcygpO1xuICAgIH1cbiAgICBpZiAodGhpcy5zd2FwKSB7XG4gICAgICB0aGlzLnN3YXAucmVzdG9yZVN3YXBJdGVtKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnB1c2gpIHtcbiAgICAgIHRoaXMucHVzaC5kZXN0cm95KCk7XG4gICAgICB0aGlzLnB1c2ggPSBudWxsITtcbiAgICB9XG4gICAgaWYgKHRoaXMuc3dhcCkge1xuICAgICAgdGhpcy5zd2FwLmRlc3Ryb3koKTtcbiAgICAgIHRoaXMuc3dhcCA9IG51bGwhO1xuICAgIH1cbiAgfTtcblxuICBtYWtlRHJhZyA9ICgpOiB2b2lkID0+IHtcbiAgICBpZiAoXG4gICAgICB0aGlzLmdyaWRzdGVyLiRvcHRpb25zLmRyYWdnYWJsZS5kcm9wT3Zlckl0ZW1zICYmXG4gICAgICB0aGlzLmdyaWRzdGVyLm9wdGlvbnMuZHJhZ2dhYmxlICYmXG4gICAgICB0aGlzLmdyaWRzdGVyLm9wdGlvbnMuZHJhZ2dhYmxlLmRyb3BPdmVySXRlbXNDYWxsYmFjayAmJlxuICAgICAgdGhpcy5jb2xsaXNpb24gJiZcbiAgICAgIHRoaXMuY29sbGlzaW9uICE9PSB0cnVlICYmXG4gICAgICB0aGlzLmNvbGxpc2lvbi4kaXRlbVxuICAgICkge1xuICAgICAgdGhpcy5ncmlkc3Rlci5vcHRpb25zLmRyYWdnYWJsZS5kcm9wT3Zlckl0ZW1zQ2FsbGJhY2soXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLml0ZW0sXG4gICAgICAgIHRoaXMuY29sbGlzaW9uLml0ZW0sXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXJcbiAgICAgICk7XG4gICAgfVxuICAgIHRoaXMuY29sbGlzaW9uID0gZmFsc2U7XG4gICAgdGhpcy5ncmlkc3Rlckl0ZW0uc2V0U2l6ZSgpO1xuICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLmNoZWNrSXRlbUNoYW5nZXMoXG4gICAgICB0aGlzLmdyaWRzdGVySXRlbS4kaXRlbSxcbiAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLml0ZW1cbiAgICApO1xuICAgIGlmICh0aGlzLnB1c2gpIHtcbiAgICAgIHRoaXMucHVzaC5zZXRQdXNoZWRJdGVtcygpO1xuICAgIH1cbiAgICBpZiAodGhpcy5zd2FwKSB7XG4gICAgICB0aGlzLnN3YXAuc2V0U3dhcEl0ZW0oKTtcbiAgICB9XG4gICAgaWYgKHRoaXMucHVzaCkge1xuICAgICAgdGhpcy5wdXNoLmRlc3Ryb3koKTtcbiAgICAgIHRoaXMucHVzaCA9IG51bGwhO1xuICAgIH1cbiAgICBpZiAodGhpcy5zd2FwKSB7XG4gICAgICB0aGlzLnN3YXAuZGVzdHJveSgpO1xuICAgICAgdGhpcy5zd2FwID0gbnVsbCE7XG4gICAgfVxuICB9O1xuXG4gIGNhbGN1bGF0ZUl0ZW1Qb3NpdGlvbigpOiB2b2lkIHtcbiAgICB0aGlzLmdyaWRzdGVyLm1vdmluZ0l0ZW0gPSB0aGlzLmdyaWRzdGVySXRlbS4kaXRlbTtcbiAgICB0aGlzLnBvc2l0aW9uWCA9IHRoaXMuZ3JpZHN0ZXIucGl4ZWxzVG9Qb3NpdGlvblgodGhpcy5sZWZ0LCBNYXRoLnJvdW5kKTtcbiAgICB0aGlzLnBvc2l0aW9uWSA9IHRoaXMuZ3JpZHN0ZXIucGl4ZWxzVG9Qb3NpdGlvblkodGhpcy50b3AsIE1hdGgucm91bmQpO1xuICAgIHRoaXMucG9zaXRpb25YQmFja3VwID0gdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0ueDtcbiAgICB0aGlzLnBvc2l0aW9uWUJhY2t1cCA9IHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtLnk7XG4gICAgdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0ueCA9IHRoaXMucG9zaXRpb25YO1xuICAgIGlmICh0aGlzLmdyaWRzdGVyLmNoZWNrR3JpZENvbGxpc2lvbih0aGlzLmdyaWRzdGVySXRlbS4kaXRlbSkpIHtcbiAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtLnggPSB0aGlzLnBvc2l0aW9uWEJhY2t1cDtcbiAgICB9XG4gICAgdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0ueSA9IHRoaXMucG9zaXRpb25ZO1xuICAgIGlmICh0aGlzLmdyaWRzdGVyLmNoZWNrR3JpZENvbGxpc2lvbih0aGlzLmdyaWRzdGVySXRlbS4kaXRlbSkpIHtcbiAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtLnkgPSB0aGlzLnBvc2l0aW9uWUJhY2t1cDtcbiAgICB9XG4gICAgdGhpcy5ncmlkc3Rlci5ncmlkUmVuZGVyZXIuc2V0Q2VsbFBvc2l0aW9uKFxuICAgICAgdGhpcy5ncmlkc3Rlckl0ZW0ucmVuZGVyZXIsXG4gICAgICB0aGlzLmdyaWRzdGVySXRlbS5lbCxcbiAgICAgIHRoaXMubGVmdCxcbiAgICAgIHRoaXMudG9wXG4gICAgKTtcblxuICAgIGlmIChcbiAgICAgIHRoaXMucG9zaXRpb25YQmFja3VwICE9PSB0aGlzLmdyaWRzdGVySXRlbS4kaXRlbS54IHx8XG4gICAgICB0aGlzLnBvc2l0aW9uWUJhY2t1cCAhPT0gdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0ueVxuICAgICkge1xuICAgICAgY29uc3QgbGFzdFBvc2l0aW9uID0gdGhpcy5wYXRoW3RoaXMucGF0aC5sZW5ndGggLSAxXTtcbiAgICAgIGxldCBkaXJlY3Rpb24gPSAnJztcbiAgICAgIGlmIChsYXN0UG9zaXRpb24ueCA8IHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtLngpIHtcbiAgICAgICAgZGlyZWN0aW9uID0gdGhpcy5wdXNoLmZyb21XZXN0O1xuICAgICAgfSBlbHNlIGlmIChsYXN0UG9zaXRpb24ueCA+IHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtLngpIHtcbiAgICAgICAgZGlyZWN0aW9uID0gdGhpcy5wdXNoLmZyb21FYXN0O1xuICAgICAgfSBlbHNlIGlmIChsYXN0UG9zaXRpb24ueSA8IHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtLnkpIHtcbiAgICAgICAgZGlyZWN0aW9uID0gdGhpcy5wdXNoLmZyb21Ob3J0aDtcbiAgICAgIH0gZWxzZSBpZiAobGFzdFBvc2l0aW9uLnkgPiB0aGlzLmdyaWRzdGVySXRlbS4kaXRlbS55KSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IHRoaXMucHVzaC5mcm9tU291dGg7XG4gICAgICB9XG4gICAgICB0aGlzLnB1c2gucHVzaEl0ZW1zKGRpcmVjdGlvbiwgdGhpcy5ncmlkc3Rlci4kb3B0aW9ucy5kaXNhYmxlUHVzaE9uRHJhZyk7XG4gICAgICB0aGlzLnN3YXAuc3dhcEl0ZW1zKCk7XG4gICAgICB0aGlzLmNvbGxpc2lvbiA9IHRoaXMuZ3JpZHN0ZXIuY2hlY2tDb2xsaXNpb24odGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0pO1xuICAgICAgaWYgKHRoaXMuY29sbGlzaW9uKSB7XG4gICAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtLnggPSB0aGlzLnBvc2l0aW9uWEJhY2t1cDtcbiAgICAgICAgdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0ueSA9IHRoaXMucG9zaXRpb25ZQmFja3VwO1xuICAgICAgICBpZiAoXG4gICAgICAgICAgdGhpcy5ncmlkc3Rlci4kb3B0aW9ucy5kcmFnZ2FibGUuZHJvcE92ZXJJdGVtcyAmJlxuICAgICAgICAgIHRoaXMuY29sbGlzaW9uICE9PSB0cnVlICYmXG4gICAgICAgICAgdGhpcy5jb2xsaXNpb24uJGl0ZW1cbiAgICAgICAgKSB7XG4gICAgICAgICAgdGhpcy5ncmlkc3Rlci5tb3ZpbmdJdGVtID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5wYXRoLnB1c2goe1xuICAgICAgICAgIHg6IHRoaXMuZ3JpZHN0ZXJJdGVtLiRpdGVtLngsXG4gICAgICAgICAgeTogdGhpcy5ncmlkc3Rlckl0ZW0uJGl0ZW0ueVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHRoaXMucHVzaC5jaGVja1B1c2hCYWNrKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHJlc2V0IHRoZSBjb2xsaXNpb24gd2hlbiB5b3UgZHJhZyBhbmQgZHJvcCBvbiBhbiBhZGphY2VudCBjZWxsIHRoYXQgaXMgbm90IGVtcHR5XG4gICAgICAvLyBhbmQgZ28gYmFjayB0byB0aGUgY2VsbCB5b3Ugd2VyZSBpbiBmcm9tIHRoZSBiZWdpbm5pbmcsXG4gICAgICAvLyB0aGlzIGlzIHRvIHByZXZlbnQgYGRyb3BPdmVySXRlbXNDYWxsYmFjaydcbiAgICAgIHRoaXMuY29sbGlzaW9uID0gZmFsc2U7XG4gICAgfVxuICAgIHRoaXMuZ3JpZHN0ZXIucHJldmlld1N0eWxlKHRydWUpO1xuICB9XG5cbiAgdG9nZ2xlKCk6IHZvaWQge1xuICAgIGNvbnN0IGVuYWJsZURyYWcgPSB0aGlzLmdyaWRzdGVySXRlbS5jYW5CZURyYWdnZWQoKTtcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCAmJiBlbmFibGVEcmFnKSB7XG4gICAgICB0aGlzLmVuYWJsZWQgPSAhdGhpcy5lbmFibGVkO1xuICAgICAgdGhpcy5tb3VzZWRvd24gPSB0aGlzLmdyaWRzdGVySXRlbS5yZW5kZXJlci5saXN0ZW4oXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXJJdGVtLmVsLFxuICAgICAgICAnbW91c2Vkb3duJyxcbiAgICAgICAgdGhpcy5kcmFnU3RhcnREZWxheVxuICAgICAgKTtcbiAgICAgIHRoaXMudG91Y2hzdGFydCA9IHRoaXMuZ3JpZHN0ZXJJdGVtLnJlbmRlcmVyLmxpc3RlbihcbiAgICAgICAgdGhpcy5ncmlkc3Rlckl0ZW0uZWwsXG4gICAgICAgICd0b3VjaHN0YXJ0JyxcbiAgICAgICAgdGhpcy5kcmFnU3RhcnREZWxheVxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuZW5hYmxlZCAmJiAhZW5hYmxlRHJhZykge1xuICAgICAgdGhpcy5lbmFibGVkID0gIXRoaXMuZW5hYmxlZDtcbiAgICAgIHRoaXMubW91c2Vkb3duKCk7XG4gICAgICB0aGlzLnRvdWNoc3RhcnQoKTtcbiAgICB9XG4gIH1cblxuICBkcmFnU3RhcnREZWxheSA9IChlOiBNb3VzZUV2ZW50KTogdm9pZCA9PiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XG4gICAgaWYgKHRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoR1JJRFNURVJfSVRFTV9SRVNJWkFCTEVfSEFORExFUl9DTEFTUykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKEdyaWRzdGVyVXRpbHMuY2hlY2tDb250ZW50Q2xhc3NGb3JFdmVudCh0aGlzLmdyaWRzdGVyLCBlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBHcmlkc3RlclV0aWxzLmNoZWNrVG91Y2hFdmVudChlKTtcbiAgICBpZiAoIXRoaXMuZ3JpZHN0ZXIuJG9wdGlvbnMuZHJhZ2dhYmxlLmRlbGF5U3RhcnQpIHtcbiAgICAgIHRoaXMuZHJhZ1N0YXJ0KGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLmRyYWdTdGFydChlKTtcbiAgICAgIGNhbmNlbERyYWcoKTtcbiAgICB9LCB0aGlzLmdyaWRzdGVyLiRvcHRpb25zLmRyYWdnYWJsZS5kZWxheVN0YXJ0KTtcbiAgICBjb25zdCBjYW5jZWxNb3VzZSA9IHRoaXMuZ3JpZHN0ZXJJdGVtLnJlbmRlcmVyLmxpc3RlbihcbiAgICAgICdkb2N1bWVudCcsXG4gICAgICAnbW91c2V1cCcsXG4gICAgICBjYW5jZWxEcmFnXG4gICAgKTtcbiAgICBjb25zdCBjYW5jZWxNb3VzZUxlYXZlID0gdGhpcy5ncmlkc3Rlckl0ZW0ucmVuZGVyZXIubGlzdGVuKFxuICAgICAgJ2RvY3VtZW50JyxcbiAgICAgICdtb3VzZWxlYXZlJyxcbiAgICAgIGNhbmNlbERyYWdcbiAgICApO1xuICAgIGNvbnN0IGNhbmNlbE9uQmx1ciA9IHRoaXMuZ3JpZHN0ZXJJdGVtLnJlbmRlcmVyLmxpc3RlbihcbiAgICAgICd3aW5kb3cnLFxuICAgICAgJ2JsdXInLFxuICAgICAgY2FuY2VsRHJhZ1xuICAgICk7XG4gICAgY29uc3QgY2FuY2VsVG91Y2hNb3ZlID0gdGhpcy5ncmlkc3Rlckl0ZW0ucmVuZGVyZXIubGlzdGVuKFxuICAgICAgJ2RvY3VtZW50JyxcbiAgICAgICd0b3VjaG1vdmUnLFxuICAgICAgY2FuY2VsTW92ZVxuICAgICk7XG4gICAgY29uc3QgY2FuY2VsVG91Y2hFbmQgPSB0aGlzLmdyaWRzdGVySXRlbS5yZW5kZXJlci5saXN0ZW4oXG4gICAgICAnZG9jdW1lbnQnLFxuICAgICAgJ3RvdWNoZW5kJyxcbiAgICAgIGNhbmNlbERyYWdcbiAgICApO1xuICAgIGNvbnN0IGNhbmNlbFRvdWNoQ2FuY2VsID0gdGhpcy5ncmlkc3Rlckl0ZW0ucmVuZGVyZXIubGlzdGVuKFxuICAgICAgJ2RvY3VtZW50JyxcbiAgICAgICd0b3VjaGNhbmNlbCcsXG4gICAgICBjYW5jZWxEcmFnXG4gICAgKTtcblxuICAgIGZ1bmN0aW9uIGNhbmNlbE1vdmUoZXZlbnRNb3ZlOiBNb3VzZUV2ZW50KTogdm9pZCB7XG4gICAgICBHcmlkc3RlclV0aWxzLmNoZWNrVG91Y2hFdmVudChldmVudE1vdmUpO1xuICAgICAgaWYgKFxuICAgICAgICBNYXRoLmFicyhldmVudE1vdmUuY2xpZW50WCAtIGUuY2xpZW50WCkgPiA5IHx8XG4gICAgICAgIE1hdGguYWJzKGV2ZW50TW92ZS5jbGllbnRZIC0gZS5jbGllbnRZKSA+IDlcbiAgICAgICkge1xuICAgICAgICBjYW5jZWxEcmFnKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FuY2VsRHJhZygpOiB2b2lkIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgIGNhbmNlbE9uQmx1cigpO1xuICAgICAgY2FuY2VsTW91c2UoKTtcbiAgICAgIGNhbmNlbE1vdXNlTGVhdmUoKTtcbiAgICAgIGNhbmNlbFRvdWNoTW92ZSgpO1xuICAgICAgY2FuY2VsVG91Y2hFbmQoKTtcbiAgICAgIGNhbmNlbFRvdWNoQ2FuY2VsKCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBsaXN0IG9mIGRpcmVjdGlvbnMgZm9yIGdpdmVuIG1vdXNlIGV2ZW50XG4gICAqIEBwYXJhbSBlIE1vdXNlIGV2ZW50XG4gICAqICovXG4gIHByaXZhdGUgZ2V0RGlyZWN0aW9ucyhlOiBNb3VzZUV2ZW50KSB7XG4gICAgY29uc3QgZGlyZWN0aW9uczogc3RyaW5nW10gPSBbXTtcbiAgICBpZiAodGhpcy5sYXN0TW91c2UuY2xpZW50WCA9PT0gMCAmJiB0aGlzLmxhc3RNb3VzZS5jbGllbnRZID09PSAwKSB7XG4gICAgICB0aGlzLmxhc3RNb3VzZS5jbGllbnRZID0gZS5jbGllbnRZO1xuICAgICAgdGhpcy5sYXN0TW91c2UuY2xpZW50WCA9IGUuY2xpZW50WDtcbiAgICB9XG4gICAgaWYgKHRoaXMubGFzdE1vdXNlLmNsaWVudFkgPiBlLmNsaWVudFkpIHtcbiAgICAgIGRpcmVjdGlvbnMucHVzaChEaXJlY3Rpb24uVVApO1xuICAgIH1cbiAgICBpZiAodGhpcy5sYXN0TW91c2UuY2xpZW50WSA8IGUuY2xpZW50WSkge1xuICAgICAgZGlyZWN0aW9ucy5wdXNoKERpcmVjdGlvbi5ET1dOKTtcbiAgICB9XG4gICAgaWYgKHRoaXMubGFzdE1vdXNlLmNsaWVudFggPCBlLmNsaWVudFgpIHtcbiAgICAgIGRpcmVjdGlvbnMucHVzaChEaXJlY3Rpb24uUklHSFQpO1xuICAgIH1cbiAgICBpZiAodGhpcy5sYXN0TW91c2UuY2xpZW50WCA+IGUuY2xpZW50WCkge1xuICAgICAgZGlyZWN0aW9ucy5wdXNoKERpcmVjdGlvbi5MRUZUKTtcbiAgICB9XG4gICAgcmV0dXJuIGRpcmVjdGlvbnM7XG4gIH1cbn1cbiJdfQ==