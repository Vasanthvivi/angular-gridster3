import { NgForOf, NgStyle } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Inject, Input, NgZone, Renderer2, ViewEncapsulation } from '@angular/core';
import { debounceTime, Subject, switchMap, takeUntil, timer } from 'rxjs';
import { GridsterCompact } from './gridsterCompact.service';
import { GridsterConfigService } from './gridsterConfig.constant';
import { GridType } from './gridsterConfig.interface';
import { GridsterEmptyCell } from './gridsterEmptyCell.service';
import { GridsterPreviewComponent } from './gridsterPreview.component';
import { GridsterRenderer } from './gridsterRenderer.service';
import { GridsterUtils } from './gridsterUtils.service';
import * as i0 from "@angular/core";
class GridsterComponent {
    constructor(el, renderer, cdRef, zone) {
        this.renderer = renderer;
        this.cdRef = cdRef;
        this.zone = zone;
        this.columns = 0;
        this.rows = 0;
        this.gridColumns = [];
        this.gridRows = [];
        this.previewStyle$ = new EventEmitter();
        this.calculateLayout$ = new Subject();
        this.resize$ = new Subject();
        this.destroy$ = new Subject();
        this.optionsChanged = () => {
            this.setOptions();
            let widgetsIndex = this.grid.length - 1;
            let widget;
            for (; widgetsIndex >= 0; widgetsIndex--) {
                widget = this.grid[widgetsIndex];
                widget.updateOptions();
            }
            this.calculateLayout();
        };
        this.onResize = () => {
            if (this.el.clientWidth) {
                if (this.options.setGridSize) {
                    // reset width/height so the size is recalculated afterwards
                    this.renderer.setStyle(this.el, 'width', '');
                    this.renderer.setStyle(this.el, 'height', '');
                }
                this.setGridSize();
                this.calculateLayout();
            }
        };
        this.getNextPossiblePosition = (newItem, startingFrom = {}) => {
            if (newItem.cols === -1) {
                newItem.cols = this.$options.defaultItemCols;
            }
            if (newItem.rows === -1) {
                newItem.rows = this.$options.defaultItemRows;
            }
            this.setGridDimensions();
            let rowsIndex = startingFrom.y || 0;
            let colsIndex;
            for (; rowsIndex < this.rows; rowsIndex++) {
                newItem.y = rowsIndex;
                colsIndex = startingFrom.x || 0;
                for (; colsIndex < this.columns; colsIndex++) {
                    newItem.x = colsIndex;
                    if (!this.checkCollision(newItem)) {
                        return true;
                    }
                }
            }
            const canAddToRows = this.$options.maxRows >= this.rows + newItem.rows;
            const canAddToColumns = this.$options.maxCols >= this.columns + newItem.cols;
            const addToRows = this.rows <= this.columns && canAddToRows;
            if (!addToRows && canAddToColumns) {
                newItem.x = this.columns;
                newItem.y = 0;
                return true;
            }
            else if (canAddToRows) {
                newItem.y = this.rows;
                newItem.x = 0;
                return true;
            }
            return false;
        };
        this.getFirstPossiblePosition = (item) => {
            const tmpItem = Object.assign({}, item);
            this.getNextPossiblePosition(tmpItem);
            return tmpItem;
        };
        this.getLastPossiblePosition = (item) => {
            let farthestItem = { y: 0, x: 0 };
            farthestItem = this.grid.reduce((prev, curr) => {
                const currCoords = {
                    y: curr.$item.y + curr.$item.rows - 1,
                    x: curr.$item.x + curr.$item.cols - 1
                };
                if (GridsterUtils.compareItems(prev, currCoords) === 1) {
                    return currCoords;
                }
                else {
                    return prev;
                }
            }, farthestItem);
            const tmpItem = Object.assign({}, item);
            this.getNextPossiblePosition(tmpItem, farthestItem);
            return tmpItem;
        };
        this.el = el.nativeElement;
        this.$options = JSON.parse(JSON.stringify(GridsterConfigService));
        this.mobile = false;
        this.curWidth = 0;
        this.curHeight = 0;
        this.grid = [];
        this.curColWidth = 0;
        this.curRowHeight = 0;
        this.dragInProgress = false;
        this.emptyCell = new GridsterEmptyCell(this);
        this.compact = new GridsterCompact(this);
        this.gridRenderer = new GridsterRenderer(this);
    }
    // ------ Function for swapWhileDragging option
    // identical to checkCollision() except that here we add boundaries.
    static checkCollisionTwoItemsForSwaping(item, item2) {
        // if the cols or rows of the items are 1 , doesnt make any sense to set a boundary. Only if the item is bigger we set a boundary
        const horizontalBoundaryItem1 = item.cols === 1 ? 0 : 1;
        const horizontalBoundaryItem2 = item2.cols === 1 ? 0 : 1;
        const verticalBoundaryItem1 = item.rows === 1 ? 0 : 1;
        const verticalBoundaryItem2 = item2.rows === 1 ? 0 : 1;
        return (item.x + horizontalBoundaryItem1 < item2.x + item2.cols &&
            item.x + item.cols > item2.x + horizontalBoundaryItem2 &&
            item.y + verticalBoundaryItem1 < item2.y + item2.rows &&
            item.y + item.rows > item2.y + verticalBoundaryItem2);
    }
    checkCollisionTwoItems(item, item2) {
        const collision = item.x < item2.x + item2.cols &&
            item.x + item.cols > item2.x &&
            item.y < item2.y + item2.rows &&
            item.y + item.rows > item2.y;
        if (!collision) {
            return false;
        }
        if (!this.$options.allowMultiLayer) {
            return true;
        }
        const defaultLayerIndex = this.$options.defaultLayerIndex;
        const layerIndex = item.layerIndex === undefined ? defaultLayerIndex : item.layerIndex;
        const layerIndex2 = item2.layerIndex === undefined ? defaultLayerIndex : item2.layerIndex;
        return layerIndex === layerIndex2;
    }
    ngOnInit() {
        if (this.options.initCallback) {
            this.options.initCallback(this);
        }
        this.calculateLayout$
            .pipe(debounceTime(0), takeUntil(this.destroy$))
            .subscribe(() => this.calculateLayout());
        this.resize$
            .pipe(
        // Cancel previously scheduled DOM timer if `calculateLayout()` has been called
        // within this time range.
        switchMap(() => timer(100)), takeUntil(this.destroy$))
            .subscribe(() => this.resize());
    }
    ngOnChanges(changes) {
        if (changes.options) {
            this.setOptions();
            this.options.api = {
                optionsChanged: this.optionsChanged,
                resize: this.onResize,
                getNextPossiblePosition: this.getNextPossiblePosition,
                getFirstPossiblePosition: this.getFirstPossiblePosition,
                getLastPossiblePosition: this.getLastPossiblePosition,
                getItemComponent: (item) => this.getItemComponent(item)
            };
            this.columns = this.$options.minCols;
            this.rows = this.$options.minRows + this.$options.addEmptyRowsCount;
            this.setGridSize();
            this.calculateLayout();
        }
    }
    resize() {
        let height;
        let width;
        if (this.$options.gridType === 'fit' && !this.mobile) {
            width = this.el.offsetWidth;
            height = this.el.offsetHeight;
        }
        else {
            width = this.el.clientWidth;
            height = this.el.clientHeight;
        }
        if ((width !== this.curWidth || height !== this.curHeight) &&
            this.checkIfToResize()) {
            this.onResize();
        }
    }
    setOptions() {
        this.$options = GridsterUtils.merge(this.$options, this.options, this.$options);
        if (!this.$options.disableWindowResize && !this.windowResize) {
            this.windowResize = this.renderer.listen('window', 'resize', this.onResize);
        }
        else if (this.$options.disableWindowResize && this.windowResize) {
            this.windowResize();
            this.windowResize = null;
        }
        this.emptyCell.updateOptions();
    }
    ngOnDestroy() {
        this.destroy$.next();
        this.previewStyle$.complete();
        if (this.windowResize) {
            this.windowResize();
        }
        if (this.options && this.options.destroyCallback) {
            this.options.destroyCallback(this);
        }
        if (this.options && this.options.api) {
            this.options.api.resize = undefined;
            this.options.api.optionsChanged = undefined;
            this.options.api.getNextPossiblePosition = undefined;
            this.options.api = undefined;
        }
        this.emptyCell.destroy();
        this.emptyCell = null;
        this.compact.destroy();
        this.compact = null;
    }
    checkIfToResize() {
        const clientWidth = this.el.clientWidth;
        const offsetWidth = this.el.offsetWidth;
        const scrollWidth = this.el.scrollWidth;
        const clientHeight = this.el.clientHeight;
        const offsetHeight = this.el.offsetHeight;
        const scrollHeight = this.el.scrollHeight;
        const verticalScrollPresent = clientWidth < offsetWidth &&
            scrollHeight > offsetHeight &&
            scrollHeight - offsetHeight < offsetWidth - clientWidth;
        const horizontalScrollPresent = clientHeight < offsetHeight &&
            scrollWidth > offsetWidth &&
            scrollWidth - offsetWidth < offsetHeight - clientHeight;
        if (verticalScrollPresent) {
            return false;
        }
        return !horizontalScrollPresent;
    }
    checkIfMobile() {
        if (this.$options.useBodyForBreakpoint) {
            return this.$options.mobileBreakpoint > document.body.clientWidth;
        }
        else {
            return this.$options.mobileBreakpoint > this.curWidth;
        }
    }
    setGridSize() {
        const el = this.el;
        let width;
        let height;
        if (this.$options.setGridSize ||
            (this.$options.gridType === GridType.Fit && !this.mobile)) {
            width = el.offsetWidth;
            height = el.offsetHeight;
        }
        else {
            width = el.clientWidth;
            height = el.clientHeight;
        }
        this.curWidth = width;
        this.curHeight = height;
    }
    setGridDimensions() {
        this.setGridSize();
        if (!this.mobile && this.checkIfMobile()) {
            this.mobile = !this.mobile;
            this.renderer.addClass(this.el, 'mobile');
        }
        else if (this.mobile && !this.checkIfMobile()) {
            this.mobile = !this.mobile;
            this.renderer.removeClass(this.el, 'mobile');
        }
        let rows = this.$options.minRows;
        let columns = this.$options.minCols;
        let widgetsIndex = this.grid.length - 1;
        let widget;
        for (; widgetsIndex >= 0; widgetsIndex--) {
            widget = this.grid[widgetsIndex];
            if (!widget.notPlaced) {
                rows = Math.max(rows, widget.$item.y + widget.$item.rows);
                columns = Math.max(columns, widget.$item.x + widget.$item.cols);
            }
        }
        rows += this.$options.addEmptyRowsCount;
        if (this.columns !== columns || this.rows !== rows) {
            this.columns = columns;
            this.rows = rows;
            if (this.options.gridSizeChangedCallback) {
                this.options.gridSizeChangedCallback(this);
            }
        }
    }
    calculateLayout() {
        if (this.compact) {
            this.compact.checkCompact();
        }
        this.setGridDimensions();
        if (this.$options.outerMargin) {
            let marginWidth = -this.$options.margin;
            if (this.$options.outerMarginLeft !== null) {
                marginWidth += this.$options.outerMarginLeft;
                this.renderer.setStyle(this.el, 'padding-left', this.$options.outerMarginLeft + 'px');
            }
            else {
                marginWidth += this.$options.margin;
                this.renderer.setStyle(this.el, 'padding-left', this.$options.margin + 'px');
            }
            if (this.$options.outerMarginRight !== null) {
                marginWidth += this.$options.outerMarginRight;
                this.renderer.setStyle(this.el, 'padding-right', this.$options.outerMarginRight + 'px');
            }
            else {
                marginWidth += this.$options.margin;
                this.renderer.setStyle(this.el, 'padding-right', this.$options.margin + 'px');
            }
            this.curColWidth = (this.curWidth - marginWidth) / this.columns;
            let marginHeight = -this.$options.margin;
            if (this.$options.outerMarginTop !== null) {
                marginHeight += this.$options.outerMarginTop;
                this.renderer.setStyle(this.el, 'padding-top', this.$options.outerMarginTop + 'px');
            }
            else {
                marginHeight += this.$options.margin;
                this.renderer.setStyle(this.el, 'padding-top', this.$options.margin + 'px');
            }
            if (this.$options.outerMarginBottom !== null) {
                marginHeight += this.$options.outerMarginBottom;
                this.renderer.setStyle(this.el, 'padding-bottom', this.$options.outerMarginBottom + 'px');
            }
            else {
                marginHeight += this.$options.margin;
                this.renderer.setStyle(this.el, 'padding-bottom', this.$options.margin + 'px');
            }
            this.curRowHeight =
                ((this.curHeight - marginHeight) / this.rows) *
                    this.$options.rowHeightRatio;
        }
        else {
            this.curColWidth = (this.curWidth + this.$options.margin) / this.columns;
            this.curRowHeight =
                ((this.curHeight + this.$options.margin) / this.rows) *
                    this.$options.rowHeightRatio;
            this.renderer.setStyle(this.el, 'padding-left', 0 + 'px');
            this.renderer.setStyle(this.el, 'padding-right', 0 + 'px');
            this.renderer.setStyle(this.el, 'padding-top', 0 + 'px');
            this.renderer.setStyle(this.el, 'padding-bottom', 0 + 'px');
        }
        this.gridRenderer.updateGridster();
        if (this.$options.setGridSize) {
            this.renderer.addClass(this.el, 'gridSize');
            if (!this.mobile) {
                this.renderer.setStyle(this.el, 'width', this.columns * this.curColWidth + this.$options.margin + 'px');
                this.renderer.setStyle(this.el, 'height', this.rows * this.curRowHeight + this.$options.margin + 'px');
            }
        }
        else {
            this.renderer.removeClass(this.el, 'gridSize');
            this.renderer.setStyle(this.el, 'width', '');
            this.renderer.setStyle(this.el, 'height', '');
        }
        this.updateGrid();
        let widgetsIndex = this.grid.length - 1;
        let widget;
        for (; widgetsIndex >= 0; widgetsIndex--) {
            widget = this.grid[widgetsIndex];
            widget.setSize();
            widget.drag.toggle();
            widget.resize.toggle();
        }
        this.resize$.next();
    }
    updateGrid() {
        if (this.$options.displayGrid === 'always' && !this.mobile) {
            this.renderer.addClass(this.el, 'display-grid');
        }
        else if (this.$options.displayGrid === 'onDrag&Resize' &&
            this.dragInProgress) {
            this.renderer.addClass(this.el, 'display-grid');
        }
        else if (this.$options.displayGrid === 'none' ||
            !this.dragInProgress ||
            this.mobile) {
            this.renderer.removeClass(this.el, 'display-grid');
        }
        this.setGridDimensions();
        this.gridColumns.length = GridsterComponent.getNewArrayLength(this.columns, this.curWidth, this.curColWidth);
        this.gridRows.length = GridsterComponent.getNewArrayLength(this.rows, this.curHeight, this.curRowHeight);
        this.cdRef.markForCheck();
    }
    addItem(itemComponent) {
        if (itemComponent.$item.cols === undefined) {
            itemComponent.$item.cols = this.$options.defaultItemCols;
            itemComponent.item.cols = itemComponent.$item.cols;
            itemComponent.itemChanged();
        }
        if (itemComponent.$item.rows === undefined) {
            itemComponent.$item.rows = this.$options.defaultItemRows;
            itemComponent.item.rows = itemComponent.$item.rows;
            itemComponent.itemChanged();
        }
        if (itemComponent.$item.x === -1 || itemComponent.$item.y === -1) {
            this.autoPositionItem(itemComponent);
        }
        else if (this.checkCollision(itemComponent.$item)) {
            if (!this.$options.disableWarnings) {
                itemComponent.notPlaced = true;
                console.warn("Can't be placed in the bounds of the dashboard, trying to auto position!/n" +
                    JSON.stringify(itemComponent.item, ['cols', 'rows', 'x', 'y']));
            }
            if (!this.$options.disableAutoPositionOnConflict) {
                this.autoPositionItem(itemComponent);
            }
            else {
                itemComponent.notPlaced = true;
            }
        }
        this.grid.push(itemComponent);
        this.calculateLayout$.next();
    }
    removeItem(itemComponent) {
        this.grid.splice(this.grid.indexOf(itemComponent), 1);
        this.calculateLayout$.next();
        if (this.options.itemRemovedCallback) {
            this.options.itemRemovedCallback(itemComponent.item, itemComponent);
        }
    }
    checkCollision(item) {
        let collision = false;
        if (this.options.itemValidateCallback) {
            collision = !this.options.itemValidateCallback(item);
        }
        if (!collision && this.checkGridCollision(item)) {
            collision = true;
        }
        if (!collision) {
            const c = this.findItemWithItem(item);
            if (c) {
                collision = c;
            }
        }
        return collision;
    }
    checkGridCollision(item) {
        const noNegativePosition = item.y > -1 && item.x > -1;
        const maxGridCols = item.cols + item.x <= this.$options.maxCols;
        const maxGridRows = item.rows + item.y <= this.$options.maxRows;
        const maxItemCols = item.maxItemCols === undefined
            ? this.$options.maxItemCols
            : item.maxItemCols;
        const minItemCols = item.minItemCols === undefined
            ? this.$options.minItemCols
            : item.minItemCols;
        const maxItemRows = item.maxItemRows === undefined
            ? this.$options.maxItemRows
            : item.maxItemRows;
        const minItemRows = item.minItemRows === undefined
            ? this.$options.minItemRows
            : item.minItemRows;
        const inColsLimits = item.cols <= maxItemCols && item.cols >= minItemCols;
        const inRowsLimits = item.rows <= maxItemRows && item.rows >= minItemRows;
        const minAreaLimit = item.minItemArea === undefined
            ? this.$options.minItemArea
            : item.minItemArea;
        const maxAreaLimit = item.maxItemArea === undefined
            ? this.$options.maxItemArea
            : item.maxItemArea;
        const area = item.cols * item.rows;
        const inMinArea = minAreaLimit <= area;
        const inMaxArea = maxAreaLimit >= area;
        return !(noNegativePosition &&
            maxGridCols &&
            maxGridRows &&
            inColsLimits &&
            inRowsLimits &&
            inMinArea &&
            inMaxArea);
    }
    findItemWithItem(item) {
        let widgetsIndex = 0;
        let widget;
        for (; widgetsIndex < this.grid.length; widgetsIndex++) {
            widget = this.grid[widgetsIndex];
            if (widget.$item !== item &&
                this.checkCollisionTwoItems(widget.$item, item)) {
                return widget;
            }
        }
        return false;
    }
    findItemsWithItem(item) {
        const a = [];
        let widgetsIndex = 0;
        let widget;
        for (; widgetsIndex < this.grid.length; widgetsIndex++) {
            widget = this.grid[widgetsIndex];
            if (widget.$item !== item &&
                this.checkCollisionTwoItems(widget.$item, item)) {
                a.push(widget);
            }
        }
        return a;
    }
    autoPositionItem(itemComponent) {
        if (this.getNextPossiblePosition(itemComponent.$item)) {
            itemComponent.notPlaced = false;
            itemComponent.item.x = itemComponent.$item.x;
            itemComponent.item.y = itemComponent.$item.y;
            itemComponent.itemChanged();
        }
        else {
            itemComponent.notPlaced = true;
            if (!this.$options.disableWarnings) {
                console.warn("Can't be placed in the bounds of the dashboard!/n" +
                    JSON.stringify(itemComponent.item, ['cols', 'rows', 'x', 'y']));
            }
        }
    }
    pixelsToPositionX(x, roundingMethod, noLimit) {
        const position = roundingMethod(x / this.curColWidth);
        if (noLimit) {
            return position;
        }
        else {
            return Math.max(position, 0);
        }
    }
    pixelsToPositionY(y, roundingMethod, noLimit) {
        const position = roundingMethod(y / this.curRowHeight);
        if (noLimit) {
            return position;
        }
        else {
            return Math.max(position, 0);
        }
    }
    positionXToPixels(x) {
        return x * this.curColWidth;
    }
    positionYToPixels(y) {
        return y * this.curRowHeight;
    }
    getItemComponent(item) {
        return this.grid.find(c => c.item === item);
    }
    // ------ Functions for swapWhileDragging option
    // identical to checkCollision() except that this function calls findItemWithItemForSwaping() instead of findItemWithItem()
    checkCollisionForSwaping(item) {
        let collision = false;
        if (this.options.itemValidateCallback) {
            collision = !this.options.itemValidateCallback(item);
        }
        if (!collision && this.checkGridCollision(item)) {
            collision = true;
        }
        if (!collision) {
            const c = this.findItemWithItemForSwapping(item);
            if (c) {
                collision = c;
            }
        }
        return collision;
    }
    // identical to findItemWithItem() except that this function calls checkCollisionTwoItemsForSwaping() instead of checkCollisionTwoItems()
    findItemWithItemForSwapping(item) {
        let widgetsIndex = this.grid.length - 1;
        let widget;
        for (; widgetsIndex > -1; widgetsIndex--) {
            widget = this.grid[widgetsIndex];
            if (widget.$item !== item &&
                GridsterComponent.checkCollisionTwoItemsForSwaping(widget.$item, item)) {
                return widget;
            }
        }
        return false;
    }
    previewStyle(drag = false) {
        if (this.movingItem) {
            if (this.compact && drag) {
                this.compact.checkCompactItem(this.movingItem);
            }
            this.previewStyle$.next(this.movingItem);
        }
        else {
            this.previewStyle$.next(null);
        }
    }
    // ------ End of functions for swapWhileDragging option
    // eslint-disable-next-line @typescript-eslint/member-ordering
    static getNewArrayLength(length, overallSize, size) {
        const newLength = Math.max(length, Math.floor(overallSize / size));
        if (newLength < 0) {
            return 0;
        }
        if (Number.isFinite(newLength)) {
            return Math.floor(newLength);
        }
        return 0;
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0", ngImport: i0, type: GridsterComponent, deps: [{ token: ElementRef }, { token: Renderer2 }, { token: ChangeDetectorRef }, { token: NgZone }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "16.0.0", type: GridsterComponent, isStandalone: true, selector: "gridster", inputs: { options: "options" }, usesOnChanges: true, ngImport: i0, template: "<div\n  class=\"gridster-column\"\n  *ngFor=\"let column of gridColumns; let i = index;\"\n  [ngStyle]=\"gridRenderer.getGridColumnStyle(i)\"\n></div>\n<div\n  class=\"gridster-row\"\n  *ngFor=\"let row of gridRows; let i = index;\"\n  [ngStyle]=\"gridRenderer.getGridRowStyle(i)\"\n></div>\n<ng-content></ng-content>\n<gridster-preview\n  [gridRenderer]=\"gridRenderer\"\n  [previewStyle$]=\"previewStyle$\"\n  class=\"gridster-preview\"\n></gridster-preview>\n", styles: ["gridster{position:relative;box-sizing:border-box;background:grey;width:100%;height:100%;-webkit-user-select:none;user-select:none;display:block}gridster.fit{overflow-x:hidden;overflow-y:hidden}gridster.scrollVertical{overflow-x:hidden;overflow-y:auto}gridster.scrollHorizontal{overflow-x:auto;overflow-y:hidden}gridster.fixed{overflow:auto}gridster.mobile{overflow-x:hidden;overflow-y:auto}gridster.mobile gridster-item{position:relative}gridster.gridSize{height:initial;width:initial}gridster.gridSize.fit{height:100%;width:100%}gridster .gridster-column,gridster .gridster-row{position:absolute;display:none;transition:.3s;box-sizing:border-box}gridster.display-grid .gridster-column,gridster.display-grid .gridster-row{display:block}gridster .gridster-column{border-left:1px solid white;border-right:1px solid white}gridster .gridster-row{border-top:1px solid white;border-bottom:1px solid white}\n"], dependencies: [{ kind: "directive", type: NgForOf, selector: "[ngFor][ngForOf]", inputs: ["ngForOf", "ngForTrackBy", "ngForTemplate"] }, { kind: "directive", type: NgStyle, selector: "[ngStyle]", inputs: ["ngStyle"] }, { kind: "component", type: GridsterPreviewComponent, selector: "gridster-preview", inputs: ["previewStyle$", "gridRenderer"] }], encapsulation: i0.ViewEncapsulation.None }); }
}
export { GridsterComponent };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0", ngImport: i0, type: GridsterComponent, decorators: [{
            type: Component,
            args: [{ selector: 'gridster', encapsulation: ViewEncapsulation.None, standalone: true, imports: [NgForOf, NgStyle, GridsterPreviewComponent], template: "<div\n  class=\"gridster-column\"\n  *ngFor=\"let column of gridColumns; let i = index;\"\n  [ngStyle]=\"gridRenderer.getGridColumnStyle(i)\"\n></div>\n<div\n  class=\"gridster-row\"\n  *ngFor=\"let row of gridRows; let i = index;\"\n  [ngStyle]=\"gridRenderer.getGridRowStyle(i)\"\n></div>\n<ng-content></ng-content>\n<gridster-preview\n  [gridRenderer]=\"gridRenderer\"\n  [previewStyle$]=\"previewStyle$\"\n  class=\"gridster-preview\"\n></gridster-preview>\n", styles: ["gridster{position:relative;box-sizing:border-box;background:grey;width:100%;height:100%;-webkit-user-select:none;user-select:none;display:block}gridster.fit{overflow-x:hidden;overflow-y:hidden}gridster.scrollVertical{overflow-x:hidden;overflow-y:auto}gridster.scrollHorizontal{overflow-x:auto;overflow-y:hidden}gridster.fixed{overflow:auto}gridster.mobile{overflow-x:hidden;overflow-y:auto}gridster.mobile gridster-item{position:relative}gridster.gridSize{height:initial;width:initial}gridster.gridSize.fit{height:100%;width:100%}gridster .gridster-column,gridster .gridster-row{position:absolute;display:none;transition:.3s;box-sizing:border-box}gridster.display-grid .gridster-column,gridster.display-grid .gridster-row{display:block}gridster .gridster-column{border-left:1px solid white;border-right:1px solid white}gridster .gridster-row{border-top:1px solid white;border-bottom:1px solid white}\n"] }]
        }], ctorParameters: function () { return [{ type: i0.ElementRef, decorators: [{
                    type: Inject,
                    args: [ElementRef]
                }] }, { type: i0.Renderer2, decorators: [{
                    type: Inject,
                    args: [Renderer2]
                }] }, { type: i0.ChangeDetectorRef, decorators: [{
                    type: Inject,
                    args: [ChangeDetectorRef]
                }] }, { type: i0.NgZone, decorators: [{
                    type: Inject,
                    args: [NgZone]
                }] }]; }, propDecorators: { options: [{
                type: Input
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JpZHN0ZXIuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vcHJvamVjdHMvYW5ndWxhci1ncmlkc3RlcjIvc3JjL2xpYi9ncmlkc3Rlci5jb21wb25lbnQudHMiLCIuLi8uLi8uLi8uLi9wcm9qZWN0cy9hbmd1bGFyLWdyaWRzdGVyMi9zcmMvbGliL2dyaWRzdGVyLmh0bWwiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUNuRCxPQUFPLEVBQ0wsaUJBQWlCLEVBQ2pCLFNBQVMsRUFDVCxVQUFVLEVBQ1YsWUFBWSxFQUNaLE1BQU0sRUFDTixLQUFLLEVBQ0wsTUFBTSxFQUlOLFNBQVMsRUFFVCxpQkFBaUIsRUFDbEIsTUFBTSxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFFMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRTVELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2xFLE9BQU8sRUFBa0IsUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFLaEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDOUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlCQUF5QixDQUFDOztBQUV4RCxNQVNhLGlCQUFpQjtJQThCNUIsWUFDc0IsRUFBYyxFQUNSLFFBQW1CLEVBQ1gsS0FBd0IsRUFDbkMsSUFBWTtRQUZULGFBQVEsR0FBUixRQUFRLENBQVc7UUFDWCxV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IE5nRm9yT2YsIE5nU3R5bGUgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtcbiAgQ2hhbmdlRGV0ZWN0b3JSZWYsXG4gIENvbXBvbmVudCxcbiAgRWxlbWVudFJlZixcbiAgRXZlbnRFbWl0dGVyLFxuICBJbmplY3QsXG4gIElucHV0LFxuICBOZ1pvbmUsXG4gIE9uQ2hhbmdlcyxcbiAgT25EZXN0cm95LFxuICBPbkluaXQsXG4gIFJlbmRlcmVyMixcbiAgU2ltcGxlQ2hhbmdlcyxcbiAgVmlld0VuY2Fwc3VsYXRpb25cbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBkZWJvdW5jZVRpbWUsIFN1YmplY3QsIHN3aXRjaE1hcCwgdGFrZVVudGlsLCB0aW1lciB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgR3JpZHN0ZXJDb21wb25lbnRJbnRlcmZhY2UgfSBmcm9tICcuL2dyaWRzdGVyLmludGVyZmFjZSc7XG5pbXBvcnQgeyBHcmlkc3RlckNvbXBhY3QgfSBmcm9tICcuL2dyaWRzdGVyQ29tcGFjdC5zZXJ2aWNlJztcblxuaW1wb3J0IHsgR3JpZHN0ZXJDb25maWdTZXJ2aWNlIH0gZnJvbSAnLi9ncmlkc3RlckNvbmZpZy5jb25zdGFudCc7XG5pbXBvcnQgeyBHcmlkc3RlckNvbmZpZywgR3JpZFR5cGUgfSBmcm9tICcuL2dyaWRzdGVyQ29uZmlnLmludGVyZmFjZSc7XG5pbXBvcnQgeyBHcmlkc3RlckNvbmZpZ1MgfSBmcm9tICcuL2dyaWRzdGVyQ29uZmlnUy5pbnRlcmZhY2UnO1xuaW1wb3J0IHsgR3JpZHN0ZXJFbXB0eUNlbGwgfSBmcm9tICcuL2dyaWRzdGVyRW1wdHlDZWxsLnNlcnZpY2UnO1xuaW1wb3J0IHtcbiAgR3JpZHN0ZXJJdGVtLFxuICBHcmlkc3Rlckl0ZW1Db21wb25lbnRJbnRlcmZhY2Vcbn0gZnJvbSAnLi9ncmlkc3Rlckl0ZW0uaW50ZXJmYWNlJztcbmltcG9ydCB7IEdyaWRzdGVyUHJldmlld0NvbXBvbmVudCB9IGZyb20gJy4vZ3JpZHN0ZXJQcmV2aWV3LmNvbXBvbmVudCc7XG5pbXBvcnQgeyBHcmlkc3RlclJlbmRlcmVyIH0gZnJvbSAnLi9ncmlkc3RlclJlbmRlcmVyLnNlcnZpY2UnO1xuaW1wb3J0IHsgR3JpZHN0ZXJVdGlscyB9IGZyb20gJy4vZ3JpZHN0ZXJVdGlscy5zZXJ2aWNlJztcblxuQENvbXBvbmVudCh7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAYW5ndWxhci1lc2xpbnQvY29tcG9uZW50LXNlbGVjdG9yXG4gIHNlbGVjdG9yOiAnZ3JpZHN0ZXInLFxuICB0ZW1wbGF0ZVVybDogJy4vZ3JpZHN0ZXIuaHRtbCcsXG4gIHN0eWxlVXJsczogWycuL2dyaWRzdGVyLmNzcyddLFxuICBlbmNhcHN1bGF0aW9uOiBWaWV3RW5jYXBzdWxhdGlvbi5Ob25lLFxuICBzdGFuZGFsb25lOiB0cnVlLFxuICBpbXBvcnRzOiBbTmdGb3JPZiwgTmdTdHlsZSwgR3JpZHN0ZXJQcmV2aWV3Q29tcG9uZW50XVxufSlcbmV4cG9ydCBjbGFzcyBHcmlkc3RlckNvbXBvbmVudFxuICBpbXBsZW1lbnRzIE9uSW5pdCwgT25DaGFuZ2VzLCBPbkRlc3Ryb3ksIEdyaWRzdGVyQ29tcG9uZW50SW50ZXJmYWNlXG57XG4gIEBJbnB1dCgpIG9wdGlvbnM6IEdyaWRzdGVyQ29uZmlnO1xuICBtb3ZpbmdJdGVtOiBHcmlkc3Rlckl0ZW0gfCBudWxsO1xuICBlbDogSFRNTEVsZW1lbnQ7XG4gICRvcHRpb25zOiBHcmlkc3RlckNvbmZpZ1M7XG4gIG1vYmlsZTogYm9vbGVhbjtcbiAgY3VyV2lkdGg6IG51bWJlcjtcbiAgY3VySGVpZ2h0OiBudW1iZXI7XG4gIGdyaWQ6IEdyaWRzdGVySXRlbUNvbXBvbmVudEludGVyZmFjZVtdO1xuICBjb2x1bW5zID0gMDtcbiAgcm93cyA9IDA7XG4gIGN1ckNvbFdpZHRoOiBudW1iZXI7XG4gIGN1clJvd0hlaWdodDogbnVtYmVyO1xuICBncmlkQ29sdW1ucyA9IFtdO1xuICBncmlkUm93cyA9IFtdO1xuICB3aW5kb3dSZXNpemU6ICgoKSA9PiB2b2lkKSB8IG51bGw7XG4gIGRyYWdJblByb2dyZXNzOiBib29sZWFuO1xuICBlbXB0eUNlbGw6IEdyaWRzdGVyRW1wdHlDZWxsO1xuICBjb21wYWN0OiBHcmlkc3RlckNvbXBhY3Q7XG4gIGdyaWRSZW5kZXJlcjogR3JpZHN0ZXJSZW5kZXJlcjtcbiAgcHJldmlld1N0eWxlJDogRXZlbnRFbWl0dGVyPEdyaWRzdGVySXRlbSB8IG51bGw+ID1cbiAgICBuZXcgRXZlbnRFbWl0dGVyPEdyaWRzdGVySXRlbSB8IG51bGw+KCk7XG5cbiAgY2FsY3VsYXRlTGF5b3V0JCA9IG5ldyBTdWJqZWN0PHZvaWQ+KCk7XG5cbiAgcHJpdmF0ZSByZXNpemUkID0gbmV3IFN1YmplY3Q8dm9pZD4oKTtcbiAgcHJpdmF0ZSBkZXN0cm95JCA9IG5ldyBTdWJqZWN0PHZvaWQ+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgQEluamVjdChFbGVtZW50UmVmKSBlbDogRWxlbWVudFJlZixcbiAgICBASW5qZWN0KFJlbmRlcmVyMikgcHVibGljIHJlbmRlcmVyOiBSZW5kZXJlcjIsXG4gICAgQEluamVjdChDaGFuZ2VEZXRlY3RvclJlZikgcHVibGljIGNkUmVmOiBDaGFuZ2VEZXRlY3RvclJlZixcbiAgICBASW5qZWN0KE5nWm9uZSkgcHVibGljIHpvbmU6IE5nWm9uZVxuICApIHtcbiAgICB0aGlzLmVsID0gZWwubmF0aXZlRWxlbWVudDtcbiAgICB0aGlzLiRvcHRpb25zID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShHcmlkc3RlckNvbmZpZ1NlcnZpY2UpKTtcbiAgICB0aGlzLm1vYmlsZSA9IGZhbHNlO1xuICAgIHRoaXMuY3VyV2lkdGggPSAwO1xuICAgIHRoaXMuY3VySGVpZ2h0ID0gMDtcbiAgICB0aGlzLmdyaWQgPSBbXTtcbiAgICB0aGlzLmN1ckNvbFdpZHRoID0gMDtcbiAgICB0aGlzLmN1clJvd0hlaWdodCA9IDA7XG4gICAgdGhpcy5kcmFnSW5Qcm9ncmVzcyA9IGZhbHNlO1xuICAgIHRoaXMuZW1wdHlDZWxsID0gbmV3IEdyaWRzdGVyRW1wdHlDZWxsKHRoaXMpO1xuICAgIHRoaXMuY29tcGFjdCA9IG5ldyBHcmlkc3RlckNvbXBhY3QodGhpcyk7XG4gICAgdGhpcy5ncmlkUmVuZGVyZXIgPSBuZXcgR3JpZHN0ZXJSZW5kZXJlcih0aGlzKTtcbiAgfVxuXG4gIC8vIC0tLS0tLSBGdW5jdGlvbiBmb3Igc3dhcFdoaWxlRHJhZ2dpbmcgb3B0aW9uXG5cbiAgLy8gaWRlbnRpY2FsIHRvIGNoZWNrQ29sbGlzaW9uKCkgZXhjZXB0IHRoYXQgaGVyZSB3ZSBhZGQgYm91bmRhcmllcy5cbiAgc3RhdGljIGNoZWNrQ29sbGlzaW9uVHdvSXRlbXNGb3JTd2FwaW5nKFxuICAgIGl0ZW06IEdyaWRzdGVySXRlbSxcbiAgICBpdGVtMjogR3JpZHN0ZXJJdGVtXG4gICk6IGJvb2xlYW4ge1xuICAgIC8vIGlmIHRoZSBjb2xzIG9yIHJvd3Mgb2YgdGhlIGl0ZW1zIGFyZSAxICwgZG9lc250IG1ha2UgYW55IHNlbnNlIHRvIHNldCBhIGJvdW5kYXJ5LiBPbmx5IGlmIHRoZSBpdGVtIGlzIGJpZ2dlciB3ZSBzZXQgYSBib3VuZGFyeVxuICAgIGNvbnN0IGhvcml6b250YWxCb3VuZGFyeUl0ZW0xID0gaXRlbS5jb2xzID09PSAxID8gMCA6IDE7XG4gICAgY29uc3QgaG9yaXpvbnRhbEJvdW5kYXJ5SXRlbTIgPSBpdGVtMi5jb2xzID09PSAxID8gMCA6IDE7XG4gICAgY29uc3QgdmVydGljYWxCb3VuZGFyeUl0ZW0xID0gaXRlbS5yb3dzID09PSAxID8gMCA6IDE7XG4gICAgY29uc3QgdmVydGljYWxCb3VuZGFyeUl0ZW0yID0gaXRlbTIucm93cyA9PT0gMSA/IDAgOiAxO1xuICAgIHJldHVybiAoXG4gICAgICBpdGVtLnggKyBob3Jpem9udGFsQm91bmRhcnlJdGVtMSA8IGl0ZW0yLnggKyBpdGVtMi5jb2xzICYmXG4gICAgICBpdGVtLnggKyBpdGVtLmNvbHMgPiBpdGVtMi54ICsgaG9yaXpvbnRhbEJvdW5kYXJ5SXRlbTIgJiZcbiAgICAgIGl0ZW0ueSArIHZlcnRpY2FsQm91bmRhcnlJdGVtMSA8IGl0ZW0yLnkgKyBpdGVtMi5yb3dzICYmXG4gICAgICBpdGVtLnkgKyBpdGVtLnJvd3MgPiBpdGVtMi55ICsgdmVydGljYWxCb3VuZGFyeUl0ZW0yXG4gICAgKTtcbiAgfVxuXG4gIGNoZWNrQ29sbGlzaW9uVHdvSXRlbXMoaXRlbTogR3JpZHN0ZXJJdGVtLCBpdGVtMjogR3JpZHN0ZXJJdGVtKTogYm9vbGVhbiB7XG4gICAgY29uc3QgY29sbGlzaW9uID1cbiAgICAgIGl0ZW0ueCA8IGl0ZW0yLnggKyBpdGVtMi5jb2xzICYmXG4gICAgICBpdGVtLnggKyBpdGVtLmNvbHMgPiBpdGVtMi54ICYmXG4gICAgICBpdGVtLnkgPCBpdGVtMi55ICsgaXRlbTIucm93cyAmJlxuICAgICAgaXRlbS55ICsgaXRlbS5yb3dzID4gaXRlbTIueTtcbiAgICBpZiAoIWNvbGxpc2lvbikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuJG9wdGlvbnMuYWxsb3dNdWx0aUxheWVyKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY29uc3QgZGVmYXVsdExheWVySW5kZXggPSB0aGlzLiRvcHRpb25zLmRlZmF1bHRMYXllckluZGV4O1xuICAgIGNvbnN0IGxheWVySW5kZXggPVxuICAgICAgaXRlbS5sYXllckluZGV4ID09PSB1bmRlZmluZWQgPyBkZWZhdWx0TGF5ZXJJbmRleCA6IGl0ZW0ubGF5ZXJJbmRleDtcbiAgICBjb25zdCBsYXllckluZGV4MiA9XG4gICAgICBpdGVtMi5sYXllckluZGV4ID09PSB1bmRlZmluZWQgPyBkZWZhdWx0TGF5ZXJJbmRleCA6IGl0ZW0yLmxheWVySW5kZXg7XG4gICAgcmV0dXJuIGxheWVySW5kZXggPT09IGxheWVySW5kZXgyO1xuICB9XG5cbiAgbmdPbkluaXQoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5pbml0Q2FsbGJhY2spIHtcbiAgICAgIHRoaXMub3B0aW9ucy5pbml0Q2FsbGJhY2sodGhpcyk7XG4gICAgfVxuXG4gICAgdGhpcy5jYWxjdWxhdGVMYXlvdXQkXG4gICAgICAucGlwZShkZWJvdW5jZVRpbWUoMCksIHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSlcbiAgICAgIC5zdWJzY3JpYmUoKCkgPT4gdGhpcy5jYWxjdWxhdGVMYXlvdXQoKSk7XG5cbiAgICB0aGlzLnJlc2l6ZSRcbiAgICAgIC5waXBlKFxuICAgICAgICAvLyBDYW5jZWwgcHJldmlvdXNseSBzY2hlZHVsZWQgRE9NIHRpbWVyIGlmIGBjYWxjdWxhdGVMYXlvdXQoKWAgaGFzIGJlZW4gY2FsbGVkXG4gICAgICAgIC8vIHdpdGhpbiB0aGlzIHRpbWUgcmFuZ2UuXG4gICAgICAgIHN3aXRjaE1hcCgoKSA9PiB0aW1lcigxMDApKSxcbiAgICAgICAgdGFrZVVudGlsKHRoaXMuZGVzdHJveSQpXG4gICAgICApXG4gICAgICAuc3Vic2NyaWJlKCgpID0+IHRoaXMucmVzaXplKCkpO1xuICB9XG5cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcyk6IHZvaWQge1xuICAgIGlmIChjaGFuZ2VzLm9wdGlvbnMpIHtcbiAgICAgIHRoaXMuc2V0T3B0aW9ucygpO1xuICAgICAgdGhpcy5vcHRpb25zLmFwaSA9IHtcbiAgICAgICAgb3B0aW9uc0NoYW5nZWQ6IHRoaXMub3B0aW9uc0NoYW5nZWQsXG4gICAgICAgIHJlc2l6ZTogdGhpcy5vblJlc2l6ZSxcbiAgICAgICAgZ2V0TmV4dFBvc3NpYmxlUG9zaXRpb246IHRoaXMuZ2V0TmV4dFBvc3NpYmxlUG9zaXRpb24sXG4gICAgICAgIGdldEZpcnN0UG9zc2libGVQb3NpdGlvbjogdGhpcy5nZXRGaXJzdFBvc3NpYmxlUG9zaXRpb24sXG4gICAgICAgIGdldExhc3RQb3NzaWJsZVBvc2l0aW9uOiB0aGlzLmdldExhc3RQb3NzaWJsZVBvc2l0aW9uLFxuICAgICAgICBnZXRJdGVtQ29tcG9uZW50OiAoaXRlbTogR3JpZHN0ZXJJdGVtKSA9PiB0aGlzLmdldEl0ZW1Db21wb25lbnQoaXRlbSlcbiAgICAgIH07XG4gICAgICB0aGlzLmNvbHVtbnMgPSB0aGlzLiRvcHRpb25zLm1pbkNvbHM7XG4gICAgICB0aGlzLnJvd3MgPSB0aGlzLiRvcHRpb25zLm1pblJvd3MgKyB0aGlzLiRvcHRpb25zLmFkZEVtcHR5Um93c0NvdW50O1xuICAgICAgdGhpcy5zZXRHcmlkU2l6ZSgpO1xuICAgICAgdGhpcy5jYWxjdWxhdGVMYXlvdXQoKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlc2l6ZSgpOiB2b2lkIHtcbiAgICBsZXQgaGVpZ2h0O1xuICAgIGxldCB3aWR0aDtcbiAgICBpZiAodGhpcy4kb3B0aW9ucy5ncmlkVHlwZSA9PT0gJ2ZpdCcgJiYgIXRoaXMubW9iaWxlKSB7XG4gICAgICB3aWR0aCA9IHRoaXMuZWwub2Zmc2V0V2lkdGg7XG4gICAgICBoZWlnaHQgPSB0aGlzLmVsLm9mZnNldEhlaWdodDtcbiAgICB9IGVsc2Uge1xuICAgICAgd2lkdGggPSB0aGlzLmVsLmNsaWVudFdpZHRoO1xuICAgICAgaGVpZ2h0ID0gdGhpcy5lbC5jbGllbnRIZWlnaHQ7XG4gICAgfVxuICAgIGlmIChcbiAgICAgICh3aWR0aCAhPT0gdGhpcy5jdXJXaWR0aCB8fCBoZWlnaHQgIT09IHRoaXMuY3VySGVpZ2h0KSAmJlxuICAgICAgdGhpcy5jaGVja0lmVG9SZXNpemUoKVxuICAgICkge1xuICAgICAgdGhpcy5vblJlc2l6ZSgpO1xuICAgIH1cbiAgfVxuXG4gIHNldE9wdGlvbnMoKTogdm9pZCB7XG4gICAgdGhpcy4kb3B0aW9ucyA9IEdyaWRzdGVyVXRpbHMubWVyZ2UoXG4gICAgICB0aGlzLiRvcHRpb25zLFxuICAgICAgdGhpcy5vcHRpb25zLFxuICAgICAgdGhpcy4kb3B0aW9uc1xuICAgICk7XG4gICAgaWYgKCF0aGlzLiRvcHRpb25zLmRpc2FibGVXaW5kb3dSZXNpemUgJiYgIXRoaXMud2luZG93UmVzaXplKSB7XG4gICAgICB0aGlzLndpbmRvd1Jlc2l6ZSA9IHRoaXMucmVuZGVyZXIubGlzdGVuKFxuICAgICAgICAnd2luZG93JyxcbiAgICAgICAgJ3Jlc2l6ZScsXG4gICAgICAgIHRoaXMub25SZXNpemVcbiAgICAgICk7XG4gICAgfSBlbHNlIGlmICh0aGlzLiRvcHRpb25zLmRpc2FibGVXaW5kb3dSZXNpemUgJiYgdGhpcy53aW5kb3dSZXNpemUpIHtcbiAgICAgIHRoaXMud2luZG93UmVzaXplKCk7XG4gICAgICB0aGlzLndpbmRvd1Jlc2l6ZSA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuZW1wdHlDZWxsLnVwZGF0ZU9wdGlvbnMoKTtcbiAgfVxuXG4gIG9wdGlvbnNDaGFuZ2VkID0gKCk6IHZvaWQgPT4ge1xuICAgIHRoaXMuc2V0T3B0aW9ucygpO1xuICAgIGxldCB3aWRnZXRzSW5kZXg6IG51bWJlciA9IHRoaXMuZ3JpZC5sZW5ndGggLSAxO1xuICAgIGxldCB3aWRnZXQ6IEdyaWRzdGVySXRlbUNvbXBvbmVudEludGVyZmFjZTtcbiAgICBmb3IgKDsgd2lkZ2V0c0luZGV4ID49IDA7IHdpZGdldHNJbmRleC0tKSB7XG4gICAgICB3aWRnZXQgPSB0aGlzLmdyaWRbd2lkZ2V0c0luZGV4XTtcbiAgICAgIHdpZGdldC51cGRhdGVPcHRpb25zKCk7XG4gICAgfVxuICAgIHRoaXMuY2FsY3VsYXRlTGF5b3V0KCk7XG4gIH07XG5cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5kZXN0cm95JC5uZXh0KCk7XG4gICAgdGhpcy5wcmV2aWV3U3R5bGUkLmNvbXBsZXRlKCk7XG4gICAgaWYgKHRoaXMud2luZG93UmVzaXplKSB7XG4gICAgICB0aGlzLndpbmRvd1Jlc2l6ZSgpO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zICYmIHRoaXMub3B0aW9ucy5kZXN0cm95Q2FsbGJhY2spIHtcbiAgICAgIHRoaXMub3B0aW9ucy5kZXN0cm95Q2FsbGJhY2sodGhpcyk7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLmFwaSkge1xuICAgICAgdGhpcy5vcHRpb25zLmFwaS5yZXNpemUgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLm9wdGlvbnMuYXBpLm9wdGlvbnNDaGFuZ2VkID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5vcHRpb25zLmFwaS5nZXROZXh0UG9zc2libGVQb3NpdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMub3B0aW9ucy5hcGkgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHRoaXMuZW1wdHlDZWxsLmRlc3Ryb3koKTtcbiAgICB0aGlzLmVtcHR5Q2VsbCA9IG51bGwhO1xuICAgIHRoaXMuY29tcGFjdC5kZXN0cm95KCk7XG4gICAgdGhpcy5jb21wYWN0ID0gbnVsbCE7XG4gIH1cblxuICBvblJlc2l6ZSA9ICgpOiB2b2lkID0+IHtcbiAgICBpZiAodGhpcy5lbC5jbGllbnRXaWR0aCkge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5zZXRHcmlkU2l6ZSkge1xuICAgICAgICAvLyByZXNldCB3aWR0aC9oZWlnaHQgc28gdGhlIHNpemUgaXMgcmVjYWxjdWxhdGVkIGFmdGVyd2FyZHNcbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRTdHlsZSh0aGlzLmVsLCAnd2lkdGgnLCAnJyk7XG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0U3R5bGUodGhpcy5lbCwgJ2hlaWdodCcsICcnKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuc2V0R3JpZFNpemUoKTtcbiAgICAgIHRoaXMuY2FsY3VsYXRlTGF5b3V0KCk7XG4gICAgfVxuICB9O1xuXG4gIGNoZWNrSWZUb1Jlc2l6ZSgpOiBib29sZWFuIHtcbiAgICBjb25zdCBjbGllbnRXaWR0aCA9IHRoaXMuZWwuY2xpZW50V2lkdGg7XG4gICAgY29uc3Qgb2Zmc2V0V2lkdGggPSB0aGlzLmVsLm9mZnNldFdpZHRoO1xuICAgIGNvbnN0IHNjcm9sbFdpZHRoID0gdGhpcy5lbC5zY3JvbGxXaWR0aDtcbiAgICBjb25zdCBjbGllbnRIZWlnaHQgPSB0aGlzLmVsLmNsaWVudEhlaWdodDtcbiAgICBjb25zdCBvZmZzZXRIZWlnaHQgPSB0aGlzLmVsLm9mZnNldEhlaWdodDtcbiAgICBjb25zdCBzY3JvbGxIZWlnaHQgPSB0aGlzLmVsLnNjcm9sbEhlaWdodDtcbiAgICBjb25zdCB2ZXJ0aWNhbFNjcm9sbFByZXNlbnQgPVxuICAgICAgY2xpZW50V2lkdGggPCBvZmZzZXRXaWR0aCAmJlxuICAgICAgc2Nyb2xsSGVpZ2h0ID4gb2Zmc2V0SGVpZ2h0ICYmXG4gICAgICBzY3JvbGxIZWlnaHQgLSBvZmZzZXRIZWlnaHQgPCBvZmZzZXRXaWR0aCAtIGNsaWVudFdpZHRoO1xuICAgIGNvbnN0IGhvcml6b250YWxTY3JvbGxQcmVzZW50ID1cbiAgICAgIGNsaWVudEhlaWdodCA8IG9mZnNldEhlaWdodCAmJlxuICAgICAgc2Nyb2xsV2lkdGggPiBvZmZzZXRXaWR0aCAmJlxuICAgICAgc2Nyb2xsV2lkdGggLSBvZmZzZXRXaWR0aCA8IG9mZnNldEhlaWdodCAtIGNsaWVudEhlaWdodDtcbiAgICBpZiAodmVydGljYWxTY3JvbGxQcmVzZW50KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiAhaG9yaXpvbnRhbFNjcm9sbFByZXNlbnQ7XG4gIH1cblxuICBjaGVja0lmTW9iaWxlKCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLiRvcHRpb25zLnVzZUJvZHlGb3JCcmVha3BvaW50KSB7XG4gICAgICByZXR1cm4gdGhpcy4kb3B0aW9ucy5tb2JpbGVCcmVha3BvaW50ID4gZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuJG9wdGlvbnMubW9iaWxlQnJlYWtwb2ludCA+IHRoaXMuY3VyV2lkdGg7XG4gICAgfVxuICB9XG5cbiAgc2V0R3JpZFNpemUoKTogdm9pZCB7XG4gICAgY29uc3QgZWwgPSB0aGlzLmVsO1xuICAgIGxldCB3aWR0aDtcbiAgICBsZXQgaGVpZ2h0O1xuICAgIGlmIChcbiAgICAgIHRoaXMuJG9wdGlvbnMuc2V0R3JpZFNpemUgfHxcbiAgICAgICh0aGlzLiRvcHRpb25zLmdyaWRUeXBlID09PSBHcmlkVHlwZS5GaXQgJiYgIXRoaXMubW9iaWxlKVxuICAgICkge1xuICAgICAgd2lkdGggPSBlbC5vZmZzZXRXaWR0aDtcbiAgICAgIGhlaWdodCA9IGVsLm9mZnNldEhlaWdodDtcbiAgICB9IGVsc2Uge1xuICAgICAgd2lkdGggPSBlbC5jbGllbnRXaWR0aDtcbiAgICAgIGhlaWdodCA9IGVsLmNsaWVudEhlaWdodDtcbiAgICB9XG4gICAgdGhpcy5jdXJXaWR0aCA9IHdpZHRoO1xuICAgIHRoaXMuY3VySGVpZ2h0ID0gaGVpZ2h0O1xuICB9XG5cbiAgc2V0R3JpZERpbWVuc2lvbnMoKTogdm9pZCB7XG4gICAgdGhpcy5zZXRHcmlkU2l6ZSgpO1xuICAgIGlmICghdGhpcy5tb2JpbGUgJiYgdGhpcy5jaGVja0lmTW9iaWxlKCkpIHtcbiAgICAgIHRoaXMubW9iaWxlID0gIXRoaXMubW9iaWxlO1xuICAgICAgdGhpcy5yZW5kZXJlci5hZGRDbGFzcyh0aGlzLmVsLCAnbW9iaWxlJyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLm1vYmlsZSAmJiAhdGhpcy5jaGVja0lmTW9iaWxlKCkpIHtcbiAgICAgIHRoaXMubW9iaWxlID0gIXRoaXMubW9iaWxlO1xuICAgICAgdGhpcy5yZW5kZXJlci5yZW1vdmVDbGFzcyh0aGlzLmVsLCAnbW9iaWxlJyk7XG4gICAgfVxuICAgIGxldCByb3dzID0gdGhpcy4kb3B0aW9ucy5taW5Sb3dzO1xuICAgIGxldCBjb2x1bW5zID0gdGhpcy4kb3B0aW9ucy5taW5Db2xzO1xuXG4gICAgbGV0IHdpZGdldHNJbmRleCA9IHRoaXMuZ3JpZC5sZW5ndGggLSAxO1xuICAgIGxldCB3aWRnZXQ7XG4gICAgZm9yICg7IHdpZGdldHNJbmRleCA+PSAwOyB3aWRnZXRzSW5kZXgtLSkge1xuICAgICAgd2lkZ2V0ID0gdGhpcy5ncmlkW3dpZGdldHNJbmRleF07XG4gICAgICBpZiAoIXdpZGdldC5ub3RQbGFjZWQpIHtcbiAgICAgICAgcm93cyA9IE1hdGgubWF4KHJvd3MsIHdpZGdldC4kaXRlbS55ICsgd2lkZ2V0LiRpdGVtLnJvd3MpO1xuICAgICAgICBjb2x1bW5zID0gTWF0aC5tYXgoY29sdW1ucywgd2lkZ2V0LiRpdGVtLnggKyB3aWRnZXQuJGl0ZW0uY29scyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJvd3MgKz0gdGhpcy4kb3B0aW9ucy5hZGRFbXB0eVJvd3NDb3VudDtcbiAgICBpZiAodGhpcy5jb2x1bW5zICE9PSBjb2x1bW5zIHx8IHRoaXMucm93cyAhPT0gcm93cykge1xuICAgICAgdGhpcy5jb2x1bW5zID0gY29sdW1ucztcbiAgICAgIHRoaXMucm93cyA9IHJvd3M7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmdyaWRTaXplQ2hhbmdlZENhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucy5ncmlkU2l6ZUNoYW5nZWRDYWxsYmFjayh0aGlzKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNhbGN1bGF0ZUxheW91dCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5jb21wYWN0KSB7XG4gICAgICB0aGlzLmNvbXBhY3QuY2hlY2tDb21wYWN0KCk7XG4gICAgfVxuXG4gICAgdGhpcy5zZXRHcmlkRGltZW5zaW9ucygpO1xuICAgIGlmICh0aGlzLiRvcHRpb25zLm91dGVyTWFyZ2luKSB7XG4gICAgICBsZXQgbWFyZ2luV2lkdGggPSAtdGhpcy4kb3B0aW9ucy5tYXJnaW47XG4gICAgICBpZiAodGhpcy4kb3B0aW9ucy5vdXRlck1hcmdpbkxlZnQgIT09IG51bGwpIHtcbiAgICAgICAgbWFyZ2luV2lkdGggKz0gdGhpcy4kb3B0aW9ucy5vdXRlck1hcmdpbkxlZnQ7XG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0U3R5bGUoXG4gICAgICAgICAgdGhpcy5lbCxcbiAgICAgICAgICAncGFkZGluZy1sZWZ0JyxcbiAgICAgICAgICB0aGlzLiRvcHRpb25zLm91dGVyTWFyZ2luTGVmdCArICdweCdcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1hcmdpbldpZHRoICs9IHRoaXMuJG9wdGlvbnMubWFyZ2luO1xuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFN0eWxlKFxuICAgICAgICAgIHRoaXMuZWwsXG4gICAgICAgICAgJ3BhZGRpbmctbGVmdCcsXG4gICAgICAgICAgdGhpcy4kb3B0aW9ucy5tYXJnaW4gKyAncHgnXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy4kb3B0aW9ucy5vdXRlck1hcmdpblJpZ2h0ICE9PSBudWxsKSB7XG4gICAgICAgIG1hcmdpbldpZHRoICs9IHRoaXMuJG9wdGlvbnMub3V0ZXJNYXJnaW5SaWdodDtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRTdHlsZShcbiAgICAgICAgICB0aGlzLmVsLFxuICAgICAgICAgICdwYWRkaW5nLXJpZ2h0JyxcbiAgICAgICAgICB0aGlzLiRvcHRpb25zLm91dGVyTWFyZ2luUmlnaHQgKyAncHgnXG4gICAgICAgICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtYXJnaW5XaWR0aCArPSB0aGlzLiRvcHRpb25zLm1hcmdpbjtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRTdHlsZShcbiAgICAgICAgICB0aGlzLmVsLFxuICAgICAgICAgICdwYWRkaW5nLXJpZ2h0JyxcbiAgICAgICAgICB0aGlzLiRvcHRpb25zLm1hcmdpbiArICdweCdcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuY3VyQ29sV2lkdGggPSAodGhpcy5jdXJXaWR0aCAtIG1hcmdpbldpZHRoKSAvIHRoaXMuY29sdW1ucztcbiAgICAgIGxldCBtYXJnaW5IZWlnaHQgPSAtdGhpcy4kb3B0aW9ucy5tYXJnaW47XG4gICAgICBpZiAodGhpcy4kb3B0aW9ucy5vdXRlck1hcmdpblRvcCAhPT0gbnVsbCkge1xuICAgICAgICBtYXJnaW5IZWlnaHQgKz0gdGhpcy4kb3B0aW9ucy5vdXRlck1hcmdpblRvcDtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRTdHlsZShcbiAgICAgICAgICB0aGlzLmVsLFxuICAgICAgICAgICdwYWRkaW5nLXRvcCcsXG4gICAgICAgICAgdGhpcy4kb3B0aW9ucy5vdXRlck1hcmdpblRvcCArICdweCdcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1hcmdpbkhlaWdodCArPSB0aGlzLiRvcHRpb25zLm1hcmdpbjtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRTdHlsZShcbiAgICAgICAgICB0aGlzLmVsLFxuICAgICAgICAgICdwYWRkaW5nLXRvcCcsXG4gICAgICAgICAgdGhpcy4kb3B0aW9ucy5tYXJnaW4gKyAncHgnXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy4kb3B0aW9ucy5vdXRlck1hcmdpbkJvdHRvbSAhPT0gbnVsbCkge1xuICAgICAgICBtYXJnaW5IZWlnaHQgKz0gdGhpcy4kb3B0aW9ucy5vdXRlck1hcmdpbkJvdHRvbTtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRTdHlsZShcbiAgICAgICAgICB0aGlzLmVsLFxuICAgICAgICAgICdwYWRkaW5nLWJvdHRvbScsXG4gICAgICAgICAgdGhpcy4kb3B0aW9ucy5vdXRlck1hcmdpbkJvdHRvbSArICdweCdcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1hcmdpbkhlaWdodCArPSB0aGlzLiRvcHRpb25zLm1hcmdpbjtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRTdHlsZShcbiAgICAgICAgICB0aGlzLmVsLFxuICAgICAgICAgICdwYWRkaW5nLWJvdHRvbScsXG4gICAgICAgICAgdGhpcy4kb3B0aW9ucy5tYXJnaW4gKyAncHgnXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICB0aGlzLmN1clJvd0hlaWdodCA9XG4gICAgICAgICgodGhpcy5jdXJIZWlnaHQgLSBtYXJnaW5IZWlnaHQpIC8gdGhpcy5yb3dzKSAqXG4gICAgICAgIHRoaXMuJG9wdGlvbnMucm93SGVpZ2h0UmF0aW87XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY3VyQ29sV2lkdGggPSAodGhpcy5jdXJXaWR0aCArIHRoaXMuJG9wdGlvbnMubWFyZ2luKSAvIHRoaXMuY29sdW1ucztcbiAgICAgIHRoaXMuY3VyUm93SGVpZ2h0ID1cbiAgICAgICAgKCh0aGlzLmN1ckhlaWdodCArIHRoaXMuJG9wdGlvbnMubWFyZ2luKSAvIHRoaXMucm93cykgKlxuICAgICAgICB0aGlzLiRvcHRpb25zLnJvd0hlaWdodFJhdGlvO1xuICAgICAgdGhpcy5yZW5kZXJlci5zZXRTdHlsZSh0aGlzLmVsLCAncGFkZGluZy1sZWZ0JywgMCArICdweCcpO1xuICAgICAgdGhpcy5yZW5kZXJlci5zZXRTdHlsZSh0aGlzLmVsLCAncGFkZGluZy1yaWdodCcsIDAgKyAncHgnKTtcbiAgICAgIHRoaXMucmVuZGVyZXIuc2V0U3R5bGUodGhpcy5lbCwgJ3BhZGRpbmctdG9wJywgMCArICdweCcpO1xuICAgICAgdGhpcy5yZW5kZXJlci5zZXRTdHlsZSh0aGlzLmVsLCAncGFkZGluZy1ib3R0b20nLCAwICsgJ3B4Jyk7XG4gICAgfVxuICAgIHRoaXMuZ3JpZFJlbmRlcmVyLnVwZGF0ZUdyaWRzdGVyKCk7XG5cbiAgICBpZiAodGhpcy4kb3B0aW9ucy5zZXRHcmlkU2l6ZSkge1xuICAgICAgdGhpcy5yZW5kZXJlci5hZGRDbGFzcyh0aGlzLmVsLCAnZ3JpZFNpemUnKTtcbiAgICAgIGlmICghdGhpcy5tb2JpbGUpIHtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRTdHlsZShcbiAgICAgICAgICB0aGlzLmVsLFxuICAgICAgICAgICd3aWR0aCcsXG4gICAgICAgICAgdGhpcy5jb2x1bW5zICogdGhpcy5jdXJDb2xXaWR0aCArIHRoaXMuJG9wdGlvbnMubWFyZ2luICsgJ3B4J1xuICAgICAgICApO1xuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFN0eWxlKFxuICAgICAgICAgIHRoaXMuZWwsXG4gICAgICAgICAgJ2hlaWdodCcsXG4gICAgICAgICAgdGhpcy5yb3dzICogdGhpcy5jdXJSb3dIZWlnaHQgKyB0aGlzLiRvcHRpb25zLm1hcmdpbiArICdweCdcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZW5kZXJlci5yZW1vdmVDbGFzcyh0aGlzLmVsLCAnZ3JpZFNpemUnKTtcbiAgICAgIHRoaXMucmVuZGVyZXIuc2V0U3R5bGUodGhpcy5lbCwgJ3dpZHRoJywgJycpO1xuICAgICAgdGhpcy5yZW5kZXJlci5zZXRTdHlsZSh0aGlzLmVsLCAnaGVpZ2h0JywgJycpO1xuICAgIH1cbiAgICB0aGlzLnVwZGF0ZUdyaWQoKTtcblxuICAgIGxldCB3aWRnZXRzSW5kZXg6IG51bWJlciA9IHRoaXMuZ3JpZC5sZW5ndGggLSAxO1xuICAgIGxldCB3aWRnZXQ6IEdyaWRzdGVySXRlbUNvbXBvbmVudEludGVyZmFjZTtcbiAgICBmb3IgKDsgd2lkZ2V0c0luZGV4ID49IDA7IHdpZGdldHNJbmRleC0tKSB7XG4gICAgICB3aWRnZXQgPSB0aGlzLmdyaWRbd2lkZ2V0c0luZGV4XTtcbiAgICAgIHdpZGdldC5zZXRTaXplKCk7XG4gICAgICB3aWRnZXQuZHJhZy50b2dnbGUoKTtcbiAgICAgIHdpZGdldC5yZXNpemUudG9nZ2xlKCk7XG4gICAgfVxuXG4gICAgdGhpcy5yZXNpemUkLm5leHQoKTtcbiAgfVxuXG4gIHVwZGF0ZUdyaWQoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuJG9wdGlvbnMuZGlzcGxheUdyaWQgPT09ICdhbHdheXMnICYmICF0aGlzLm1vYmlsZSkge1xuICAgICAgdGhpcy5yZW5kZXJlci5hZGRDbGFzcyh0aGlzLmVsLCAnZGlzcGxheS1ncmlkJyk7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgIHRoaXMuJG9wdGlvbnMuZGlzcGxheUdyaWQgPT09ICdvbkRyYWcmUmVzaXplJyAmJlxuICAgICAgdGhpcy5kcmFnSW5Qcm9ncmVzc1xuICAgICkge1xuICAgICAgdGhpcy5yZW5kZXJlci5hZGRDbGFzcyh0aGlzLmVsLCAnZGlzcGxheS1ncmlkJyk7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgIHRoaXMuJG9wdGlvbnMuZGlzcGxheUdyaWQgPT09ICdub25lJyB8fFxuICAgICAgIXRoaXMuZHJhZ0luUHJvZ3Jlc3MgfHxcbiAgICAgIHRoaXMubW9iaWxlXG4gICAgKSB7XG4gICAgICB0aGlzLnJlbmRlcmVyLnJlbW92ZUNsYXNzKHRoaXMuZWwsICdkaXNwbGF5LWdyaWQnKTtcbiAgICB9XG4gICAgdGhpcy5zZXRHcmlkRGltZW5zaW9ucygpO1xuICAgIHRoaXMuZ3JpZENvbHVtbnMubGVuZ3RoID0gR3JpZHN0ZXJDb21wb25lbnQuZ2V0TmV3QXJyYXlMZW5ndGgoXG4gICAgICB0aGlzLmNvbHVtbnMsXG4gICAgICB0aGlzLmN1cldpZHRoLFxuICAgICAgdGhpcy5jdXJDb2xXaWR0aFxuICAgICk7XG4gICAgdGhpcy5ncmlkUm93cy5sZW5ndGggPSBHcmlkc3RlckNvbXBvbmVudC5nZXROZXdBcnJheUxlbmd0aChcbiAgICAgIHRoaXMucm93cyxcbiAgICAgIHRoaXMuY3VySGVpZ2h0LFxuICAgICAgdGhpcy5jdXJSb3dIZWlnaHRcbiAgICApO1xuICAgIHRoaXMuY2RSZWYubWFya0ZvckNoZWNrKCk7XG4gIH1cblxuICBhZGRJdGVtKGl0ZW1Db21wb25lbnQ6IEdyaWRzdGVySXRlbUNvbXBvbmVudEludGVyZmFjZSk6IHZvaWQge1xuICAgIGlmIChpdGVtQ29tcG9uZW50LiRpdGVtLmNvbHMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgaXRlbUNvbXBvbmVudC4kaXRlbS5jb2xzID0gdGhpcy4kb3B0aW9ucy5kZWZhdWx0SXRlbUNvbHM7XG4gICAgICBpdGVtQ29tcG9uZW50Lml0ZW0uY29scyA9IGl0ZW1Db21wb25lbnQuJGl0ZW0uY29scztcbiAgICAgIGl0ZW1Db21wb25lbnQuaXRlbUNoYW5nZWQoKTtcbiAgICB9XG4gICAgaWYgKGl0ZW1Db21wb25lbnQuJGl0ZW0ucm93cyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBpdGVtQ29tcG9uZW50LiRpdGVtLnJvd3MgPSB0aGlzLiRvcHRpb25zLmRlZmF1bHRJdGVtUm93cztcbiAgICAgIGl0ZW1Db21wb25lbnQuaXRlbS5yb3dzID0gaXRlbUNvbXBvbmVudC4kaXRlbS5yb3dzO1xuICAgICAgaXRlbUNvbXBvbmVudC5pdGVtQ2hhbmdlZCgpO1xuICAgIH1cbiAgICBpZiAoaXRlbUNvbXBvbmVudC4kaXRlbS54ID09PSAtMSB8fCBpdGVtQ29tcG9uZW50LiRpdGVtLnkgPT09IC0xKSB7XG4gICAgICB0aGlzLmF1dG9Qb3NpdGlvbkl0ZW0oaXRlbUNvbXBvbmVudCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmNoZWNrQ29sbGlzaW9uKGl0ZW1Db21wb25lbnQuJGl0ZW0pKSB7XG4gICAgICBpZiAoIXRoaXMuJG9wdGlvbnMuZGlzYWJsZVdhcm5pbmdzKSB7XG4gICAgICAgIGl0ZW1Db21wb25lbnQubm90UGxhY2VkID0gdHJ1ZTtcbiAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgIFwiQ2FuJ3QgYmUgcGxhY2VkIGluIHRoZSBib3VuZHMgb2YgdGhlIGRhc2hib2FyZCwgdHJ5aW5nIHRvIGF1dG8gcG9zaXRpb24hL25cIiArXG4gICAgICAgICAgICBKU09OLnN0cmluZ2lmeShpdGVtQ29tcG9uZW50Lml0ZW0sIFsnY29scycsICdyb3dzJywgJ3gnLCAneSddKVxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLiRvcHRpb25zLmRpc2FibGVBdXRvUG9zaXRpb25PbkNvbmZsaWN0KSB7XG4gICAgICAgIHRoaXMuYXV0b1Bvc2l0aW9uSXRlbShpdGVtQ29tcG9uZW50KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGl0ZW1Db21wb25lbnQubm90UGxhY2VkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5ncmlkLnB1c2goaXRlbUNvbXBvbmVudCk7XG4gICAgdGhpcy5jYWxjdWxhdGVMYXlvdXQkLm5leHQoKTtcbiAgfVxuXG4gIHJlbW92ZUl0ZW0oaXRlbUNvbXBvbmVudDogR3JpZHN0ZXJJdGVtQ29tcG9uZW50SW50ZXJmYWNlKTogdm9pZCB7XG4gICAgdGhpcy5ncmlkLnNwbGljZSh0aGlzLmdyaWQuaW5kZXhPZihpdGVtQ29tcG9uZW50KSwgMSk7XG4gICAgdGhpcy5jYWxjdWxhdGVMYXlvdXQkLm5leHQoKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLml0ZW1SZW1vdmVkQ2FsbGJhY2spIHtcbiAgICAgIHRoaXMub3B0aW9ucy5pdGVtUmVtb3ZlZENhbGxiYWNrKGl0ZW1Db21wb25lbnQuaXRlbSwgaXRlbUNvbXBvbmVudCk7XG4gICAgfVxuICB9XG5cbiAgY2hlY2tDb2xsaXNpb24oaXRlbTogR3JpZHN0ZXJJdGVtKTogR3JpZHN0ZXJJdGVtQ29tcG9uZW50SW50ZXJmYWNlIHwgYm9vbGVhbiB7XG4gICAgbGV0IGNvbGxpc2lvbjogR3JpZHN0ZXJJdGVtQ29tcG9uZW50SW50ZXJmYWNlIHwgYm9vbGVhbiA9IGZhbHNlO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuaXRlbVZhbGlkYXRlQ2FsbGJhY2spIHtcbiAgICAgIGNvbGxpc2lvbiA9ICF0aGlzLm9wdGlvbnMuaXRlbVZhbGlkYXRlQ2FsbGJhY2soaXRlbSk7XG4gICAgfVxuICAgIGlmICghY29sbGlzaW9uICYmIHRoaXMuY2hlY2tHcmlkQ29sbGlzaW9uKGl0ZW0pKSB7XG4gICAgICBjb2xsaXNpb24gPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoIWNvbGxpc2lvbikge1xuICAgICAgY29uc3QgYyA9IHRoaXMuZmluZEl0ZW1XaXRoSXRlbShpdGVtKTtcbiAgICAgIGlmIChjKSB7XG4gICAgICAgIGNvbGxpc2lvbiA9IGM7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb2xsaXNpb247XG4gIH1cblxuICBjaGVja0dyaWRDb2xsaXNpb24oaXRlbTogR3JpZHN0ZXJJdGVtKTogYm9vbGVhbiB7XG4gICAgY29uc3Qgbm9OZWdhdGl2ZVBvc2l0aW9uID0gaXRlbS55ID4gLTEgJiYgaXRlbS54ID4gLTE7XG4gICAgY29uc3QgbWF4R3JpZENvbHMgPSBpdGVtLmNvbHMgKyBpdGVtLnggPD0gdGhpcy4kb3B0aW9ucy5tYXhDb2xzO1xuICAgIGNvbnN0IG1heEdyaWRSb3dzID0gaXRlbS5yb3dzICsgaXRlbS55IDw9IHRoaXMuJG9wdGlvbnMubWF4Um93cztcbiAgICBjb25zdCBtYXhJdGVtQ29scyA9XG4gICAgICBpdGVtLm1heEl0ZW1Db2xzID09PSB1bmRlZmluZWRcbiAgICAgICAgPyB0aGlzLiRvcHRpb25zLm1heEl0ZW1Db2xzXG4gICAgICAgIDogaXRlbS5tYXhJdGVtQ29scztcbiAgICBjb25zdCBtaW5JdGVtQ29scyA9XG4gICAgICBpdGVtLm1pbkl0ZW1Db2xzID09PSB1bmRlZmluZWRcbiAgICAgICAgPyB0aGlzLiRvcHRpb25zLm1pbkl0ZW1Db2xzXG4gICAgICAgIDogaXRlbS5taW5JdGVtQ29scztcbiAgICBjb25zdCBtYXhJdGVtUm93cyA9XG4gICAgICBpdGVtLm1heEl0ZW1Sb3dzID09PSB1bmRlZmluZWRcbiAgICAgICAgPyB0aGlzLiRvcHRpb25zLm1heEl0ZW1Sb3dzXG4gICAgICAgIDogaXRlbS5tYXhJdGVtUm93cztcbiAgICBjb25zdCBtaW5JdGVtUm93cyA9XG4gICAgICBpdGVtLm1pbkl0ZW1Sb3dzID09PSB1bmRlZmluZWRcbiAgICAgICAgPyB0aGlzLiRvcHRpb25zLm1pbkl0ZW1Sb3dzXG4gICAgICAgIDogaXRlbS5taW5JdGVtUm93cztcbiAgICBjb25zdCBpbkNvbHNMaW1pdHMgPSBpdGVtLmNvbHMgPD0gbWF4SXRlbUNvbHMgJiYgaXRlbS5jb2xzID49IG1pbkl0ZW1Db2xzO1xuICAgIGNvbnN0IGluUm93c0xpbWl0cyA9IGl0ZW0ucm93cyA8PSBtYXhJdGVtUm93cyAmJiBpdGVtLnJvd3MgPj0gbWluSXRlbVJvd3M7XG4gICAgY29uc3QgbWluQXJlYUxpbWl0ID1cbiAgICAgIGl0ZW0ubWluSXRlbUFyZWEgPT09IHVuZGVmaW5lZFxuICAgICAgICA/IHRoaXMuJG9wdGlvbnMubWluSXRlbUFyZWFcbiAgICAgICAgOiBpdGVtLm1pbkl0ZW1BcmVhO1xuICAgIGNvbnN0IG1heEFyZWFMaW1pdCA9XG4gICAgICBpdGVtLm1heEl0ZW1BcmVhID09PSB1bmRlZmluZWRcbiAgICAgICAgPyB0aGlzLiRvcHRpb25zLm1heEl0ZW1BcmVhXG4gICAgICAgIDogaXRlbS5tYXhJdGVtQXJlYTtcbiAgICBjb25zdCBhcmVhID0gaXRlbS5jb2xzICogaXRlbS5yb3dzO1xuICAgIGNvbnN0IGluTWluQXJlYSA9IG1pbkFyZWFMaW1pdCA8PSBhcmVhO1xuICAgIGNvbnN0IGluTWF4QXJlYSA9IG1heEFyZWFMaW1pdCA+PSBhcmVhO1xuICAgIHJldHVybiAhKFxuICAgICAgbm9OZWdhdGl2ZVBvc2l0aW9uICYmXG4gICAgICBtYXhHcmlkQ29scyAmJlxuICAgICAgbWF4R3JpZFJvd3MgJiZcbiAgICAgIGluQ29sc0xpbWl0cyAmJlxuICAgICAgaW5Sb3dzTGltaXRzICYmXG4gICAgICBpbk1pbkFyZWEgJiZcbiAgICAgIGluTWF4QXJlYVxuICAgICk7XG4gIH1cblxuICBmaW5kSXRlbVdpdGhJdGVtKFxuICAgIGl0ZW06IEdyaWRzdGVySXRlbVxuICApOiBHcmlkc3Rlckl0ZW1Db21wb25lbnRJbnRlcmZhY2UgfCBib29sZWFuIHtcbiAgICBsZXQgd2lkZ2V0c0luZGV4ID0gMDtcbiAgICBsZXQgd2lkZ2V0OiBHcmlkc3Rlckl0ZW1Db21wb25lbnRJbnRlcmZhY2U7XG4gICAgZm9yICg7IHdpZGdldHNJbmRleCA8IHRoaXMuZ3JpZC5sZW5ndGg7IHdpZGdldHNJbmRleCsrKSB7XG4gICAgICB3aWRnZXQgPSB0aGlzLmdyaWRbd2lkZ2V0c0luZGV4XTtcbiAgICAgIGlmIChcbiAgICAgICAgd2lkZ2V0LiRpdGVtICE9PSBpdGVtICYmXG4gICAgICAgIHRoaXMuY2hlY2tDb2xsaXNpb25Ud29JdGVtcyh3aWRnZXQuJGl0ZW0sIGl0ZW0pXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIHdpZGdldDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZmluZEl0ZW1zV2l0aEl0ZW0oaXRlbTogR3JpZHN0ZXJJdGVtKTogQXJyYXk8R3JpZHN0ZXJJdGVtQ29tcG9uZW50SW50ZXJmYWNlPiB7XG4gICAgY29uc3QgYTogQXJyYXk8R3JpZHN0ZXJJdGVtQ29tcG9uZW50SW50ZXJmYWNlPiA9IFtdO1xuICAgIGxldCB3aWRnZXRzSW5kZXggPSAwO1xuICAgIGxldCB3aWRnZXQ6IEdyaWRzdGVySXRlbUNvbXBvbmVudEludGVyZmFjZTtcbiAgICBmb3IgKDsgd2lkZ2V0c0luZGV4IDwgdGhpcy5ncmlkLmxlbmd0aDsgd2lkZ2V0c0luZGV4KyspIHtcbiAgICAgIHdpZGdldCA9IHRoaXMuZ3JpZFt3aWRnZXRzSW5kZXhdO1xuICAgICAgaWYgKFxuICAgICAgICB3aWRnZXQuJGl0ZW0gIT09IGl0ZW0gJiZcbiAgICAgICAgdGhpcy5jaGVja0NvbGxpc2lvblR3b0l0ZW1zKHdpZGdldC4kaXRlbSwgaXRlbSlcbiAgICAgICkge1xuICAgICAgICBhLnB1c2god2lkZ2V0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGE7XG4gIH1cblxuICBhdXRvUG9zaXRpb25JdGVtKGl0ZW1Db21wb25lbnQ6IEdyaWRzdGVySXRlbUNvbXBvbmVudEludGVyZmFjZSk6IHZvaWQge1xuICAgIGlmICh0aGlzLmdldE5leHRQb3NzaWJsZVBvc2l0aW9uKGl0ZW1Db21wb25lbnQuJGl0ZW0pKSB7XG4gICAgICBpdGVtQ29tcG9uZW50Lm5vdFBsYWNlZCA9IGZhbHNlO1xuICAgICAgaXRlbUNvbXBvbmVudC5pdGVtLnggPSBpdGVtQ29tcG9uZW50LiRpdGVtLng7XG4gICAgICBpdGVtQ29tcG9uZW50Lml0ZW0ueSA9IGl0ZW1Db21wb25lbnQuJGl0ZW0ueTtcbiAgICAgIGl0ZW1Db21wb25lbnQuaXRlbUNoYW5nZWQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaXRlbUNvbXBvbmVudC5ub3RQbGFjZWQgPSB0cnVlO1xuICAgICAgaWYgKCF0aGlzLiRvcHRpb25zLmRpc2FibGVXYXJuaW5ncykge1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgXCJDYW4ndCBiZSBwbGFjZWQgaW4gdGhlIGJvdW5kcyBvZiB0aGUgZGFzaGJvYXJkIS9uXCIgK1xuICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoaXRlbUNvbXBvbmVudC5pdGVtLCBbJ2NvbHMnLCAncm93cycsICd4JywgJ3knXSlcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXROZXh0UG9zc2libGVQb3NpdGlvbiA9IChcbiAgICBuZXdJdGVtOiBHcmlkc3Rlckl0ZW0sXG4gICAgc3RhcnRpbmdGcm9tOiB7IHk/OiBudW1iZXI7IHg/OiBudW1iZXIgfSA9IHt9XG4gICk6IGJvb2xlYW4gPT4ge1xuICAgIGlmIChuZXdJdGVtLmNvbHMgPT09IC0xKSB7XG4gICAgICBuZXdJdGVtLmNvbHMgPSB0aGlzLiRvcHRpb25zLmRlZmF1bHRJdGVtQ29scztcbiAgICB9XG4gICAgaWYgKG5ld0l0ZW0ucm93cyA9PT0gLTEpIHtcbiAgICAgIG5ld0l0ZW0ucm93cyA9IHRoaXMuJG9wdGlvbnMuZGVmYXVsdEl0ZW1Sb3dzO1xuICAgIH1cbiAgICB0aGlzLnNldEdyaWREaW1lbnNpb25zKCk7XG4gICAgbGV0IHJvd3NJbmRleCA9IHN0YXJ0aW5nRnJvbS55IHx8IDA7XG4gICAgbGV0IGNvbHNJbmRleDtcbiAgICBmb3IgKDsgcm93c0luZGV4IDwgdGhpcy5yb3dzOyByb3dzSW5kZXgrKykge1xuICAgICAgbmV3SXRlbS55ID0gcm93c0luZGV4O1xuICAgICAgY29sc0luZGV4ID0gc3RhcnRpbmdGcm9tLnggfHwgMDtcbiAgICAgIGZvciAoOyBjb2xzSW5kZXggPCB0aGlzLmNvbHVtbnM7IGNvbHNJbmRleCsrKSB7XG4gICAgICAgIG5ld0l0ZW0ueCA9IGNvbHNJbmRleDtcbiAgICAgICAgaWYgKCF0aGlzLmNoZWNrQ29sbGlzaW9uKG5ld0l0ZW0pKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgY2FuQWRkVG9Sb3dzID0gdGhpcy4kb3B0aW9ucy5tYXhSb3dzID49IHRoaXMucm93cyArIG5ld0l0ZW0ucm93cztcbiAgICBjb25zdCBjYW5BZGRUb0NvbHVtbnMgPVxuICAgICAgdGhpcy4kb3B0aW9ucy5tYXhDb2xzID49IHRoaXMuY29sdW1ucyArIG5ld0l0ZW0uY29scztcbiAgICBjb25zdCBhZGRUb1Jvd3MgPSB0aGlzLnJvd3MgPD0gdGhpcy5jb2x1bW5zICYmIGNhbkFkZFRvUm93cztcbiAgICBpZiAoIWFkZFRvUm93cyAmJiBjYW5BZGRUb0NvbHVtbnMpIHtcbiAgICAgIG5ld0l0ZW0ueCA9IHRoaXMuY29sdW1ucztcbiAgICAgIG5ld0l0ZW0ueSA9IDA7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKGNhbkFkZFRvUm93cykge1xuICAgICAgbmV3SXRlbS55ID0gdGhpcy5yb3dzO1xuICAgICAgbmV3SXRlbS54ID0gMDtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgZ2V0Rmlyc3RQb3NzaWJsZVBvc2l0aW9uID0gKGl0ZW06IEdyaWRzdGVySXRlbSk6IEdyaWRzdGVySXRlbSA9PiB7XG4gICAgY29uc3QgdG1wSXRlbSA9IE9iamVjdC5hc3NpZ24oe30sIGl0ZW0pO1xuICAgIHRoaXMuZ2V0TmV4dFBvc3NpYmxlUG9zaXRpb24odG1wSXRlbSk7XG4gICAgcmV0dXJuIHRtcEl0ZW07XG4gIH07XG5cbiAgZ2V0TGFzdFBvc3NpYmxlUG9zaXRpb24gPSAoaXRlbTogR3JpZHN0ZXJJdGVtKTogR3JpZHN0ZXJJdGVtID0+IHtcbiAgICBsZXQgZmFydGhlc3RJdGVtOiB7IHk6IG51bWJlcjsgeDogbnVtYmVyIH0gPSB7IHk6IDAsIHg6IDAgfTtcbiAgICBmYXJ0aGVzdEl0ZW0gPSB0aGlzLmdyaWQucmVkdWNlKFxuICAgICAgKFxuICAgICAgICBwcmV2OiB7IHk6IG51bWJlcjsgeDogbnVtYmVyIH0sXG4gICAgICAgIGN1cnI6IEdyaWRzdGVySXRlbUNvbXBvbmVudEludGVyZmFjZVxuICAgICAgKSA9PiB7XG4gICAgICAgIGNvbnN0IGN1cnJDb29yZHMgPSB7XG4gICAgICAgICAgeTogY3Vyci4kaXRlbS55ICsgY3Vyci4kaXRlbS5yb3dzIC0gMSxcbiAgICAgICAgICB4OiBjdXJyLiRpdGVtLnggKyBjdXJyLiRpdGVtLmNvbHMgLSAxXG4gICAgICAgIH07XG4gICAgICAgIGlmIChHcmlkc3RlclV0aWxzLmNvbXBhcmVJdGVtcyhwcmV2LCBjdXJyQ29vcmRzKSA9PT0gMSkge1xuICAgICAgICAgIHJldHVybiBjdXJyQ29vcmRzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgZmFydGhlc3RJdGVtXG4gICAgKTtcblxuICAgIGNvbnN0IHRtcEl0ZW0gPSBPYmplY3QuYXNzaWduKHt9LCBpdGVtKTtcbiAgICB0aGlzLmdldE5leHRQb3NzaWJsZVBvc2l0aW9uKHRtcEl0ZW0sIGZhcnRoZXN0SXRlbSk7XG4gICAgcmV0dXJuIHRtcEl0ZW07XG4gIH07XG5cbiAgcGl4ZWxzVG9Qb3NpdGlvblgoXG4gICAgeDogbnVtYmVyLFxuICAgIHJvdW5kaW5nTWV0aG9kOiAoeDogbnVtYmVyKSA9PiBudW1iZXIsXG4gICAgbm9MaW1pdD86IGJvb2xlYW5cbiAgKTogbnVtYmVyIHtcbiAgICBjb25zdCBwb3NpdGlvbiA9IHJvdW5kaW5nTWV0aG9kKHggLyB0aGlzLmN1ckNvbFdpZHRoKTtcbiAgICBpZiAobm9MaW1pdCkge1xuICAgICAgcmV0dXJuIHBvc2l0aW9uO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gTWF0aC5tYXgocG9zaXRpb24sIDApO1xuICAgIH1cbiAgfVxuXG4gIHBpeGVsc1RvUG9zaXRpb25ZKFxuICAgIHk6IG51bWJlcixcbiAgICByb3VuZGluZ01ldGhvZDogKHg6IG51bWJlcikgPT4gbnVtYmVyLFxuICAgIG5vTGltaXQ/OiBib29sZWFuXG4gICk6IG51bWJlciB7XG4gICAgY29uc3QgcG9zaXRpb24gPSByb3VuZGluZ01ldGhvZCh5IC8gdGhpcy5jdXJSb3dIZWlnaHQpO1xuICAgIGlmIChub0xpbWl0KSB7XG4gICAgICByZXR1cm4gcG9zaXRpb247XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBNYXRoLm1heChwb3NpdGlvbiwgMCk7XG4gICAgfVxuICB9XG5cbiAgcG9zaXRpb25YVG9QaXhlbHMoeDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICByZXR1cm4geCAqIHRoaXMuY3VyQ29sV2lkdGg7XG4gIH1cblxuICBwb3NpdGlvbllUb1BpeGVscyh5OiBudW1iZXIpOiBudW1iZXIge1xuICAgIHJldHVybiB5ICogdGhpcy5jdXJSb3dIZWlnaHQ7XG4gIH1cblxuICBnZXRJdGVtQ29tcG9uZW50KFxuICAgIGl0ZW06IEdyaWRzdGVySXRlbVxuICApOiBHcmlkc3Rlckl0ZW1Db21wb25lbnRJbnRlcmZhY2UgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLmdyaWQuZmluZChjID0+IGMuaXRlbSA9PT0gaXRlbSk7XG4gIH1cblxuICAvLyAtLS0tLS0gRnVuY3Rpb25zIGZvciBzd2FwV2hpbGVEcmFnZ2luZyBvcHRpb25cblxuICAvLyBpZGVudGljYWwgdG8gY2hlY2tDb2xsaXNpb24oKSBleGNlcHQgdGhhdCB0aGlzIGZ1bmN0aW9uIGNhbGxzIGZpbmRJdGVtV2l0aEl0ZW1Gb3JTd2FwaW5nKCkgaW5zdGVhZCBvZiBmaW5kSXRlbVdpdGhJdGVtKClcbiAgY2hlY2tDb2xsaXNpb25Gb3JTd2FwaW5nKFxuICAgIGl0ZW06IEdyaWRzdGVySXRlbVxuICApOiBHcmlkc3Rlckl0ZW1Db21wb25lbnRJbnRlcmZhY2UgfCBib29sZWFuIHtcbiAgICBsZXQgY29sbGlzaW9uOiBHcmlkc3Rlckl0ZW1Db21wb25lbnRJbnRlcmZhY2UgfCBib29sZWFuID0gZmFsc2U7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5pdGVtVmFsaWRhdGVDYWxsYmFjaykge1xuICAgICAgY29sbGlzaW9uID0gIXRoaXMub3B0aW9ucy5pdGVtVmFsaWRhdGVDYWxsYmFjayhpdGVtKTtcbiAgICB9XG4gICAgaWYgKCFjb2xsaXNpb24gJiYgdGhpcy5jaGVja0dyaWRDb2xsaXNpb24oaXRlbSkpIHtcbiAgICAgIGNvbGxpc2lvbiA9IHRydWU7XG4gICAgfVxuICAgIGlmICghY29sbGlzaW9uKSB7XG4gICAgICBjb25zdCBjID0gdGhpcy5maW5kSXRlbVdpdGhJdGVtRm9yU3dhcHBpbmcoaXRlbSk7XG4gICAgICBpZiAoYykge1xuICAgICAgICBjb2xsaXNpb24gPSBjO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY29sbGlzaW9uO1xuICB9XG5cbiAgLy8gaWRlbnRpY2FsIHRvIGZpbmRJdGVtV2l0aEl0ZW0oKSBleGNlcHQgdGhhdCB0aGlzIGZ1bmN0aW9uIGNhbGxzIGNoZWNrQ29sbGlzaW9uVHdvSXRlbXNGb3JTd2FwaW5nKCkgaW5zdGVhZCBvZiBjaGVja0NvbGxpc2lvblR3b0l0ZW1zKClcbiAgZmluZEl0ZW1XaXRoSXRlbUZvclN3YXBwaW5nKFxuICAgIGl0ZW06IEdyaWRzdGVySXRlbVxuICApOiBHcmlkc3Rlckl0ZW1Db21wb25lbnRJbnRlcmZhY2UgfCBib29sZWFuIHtcbiAgICBsZXQgd2lkZ2V0c0luZGV4OiBudW1iZXIgPSB0aGlzLmdyaWQubGVuZ3RoIC0gMTtcbiAgICBsZXQgd2lkZ2V0OiBHcmlkc3Rlckl0ZW1Db21wb25lbnRJbnRlcmZhY2U7XG4gICAgZm9yICg7IHdpZGdldHNJbmRleCA+IC0xOyB3aWRnZXRzSW5kZXgtLSkge1xuICAgICAgd2lkZ2V0ID0gdGhpcy5ncmlkW3dpZGdldHNJbmRleF07XG4gICAgICBpZiAoXG4gICAgICAgIHdpZGdldC4kaXRlbSAhPT0gaXRlbSAmJlxuICAgICAgICBHcmlkc3RlckNvbXBvbmVudC5jaGVja0NvbGxpc2lvblR3b0l0ZW1zRm9yU3dhcGluZyh3aWRnZXQuJGl0ZW0sIGl0ZW0pXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIHdpZGdldDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcHJldmlld1N0eWxlKGRyYWcgPSBmYWxzZSk6IHZvaWQge1xuICAgIGlmICh0aGlzLm1vdmluZ0l0ZW0pIHtcbiAgICAgIGlmICh0aGlzLmNvbXBhY3QgJiYgZHJhZykge1xuICAgICAgICB0aGlzLmNvbXBhY3QuY2hlY2tDb21wYWN0SXRlbSh0aGlzLm1vdmluZ0l0ZW0pO1xuICAgICAgfVxuICAgICAgdGhpcy5wcmV2aWV3U3R5bGUkLm5leHQodGhpcy5tb3ZpbmdJdGVtKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wcmV2aWV3U3R5bGUkLm5leHQobnVsbCk7XG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLS0tIEVuZCBvZiBmdW5jdGlvbnMgZm9yIHN3YXBXaGlsZURyYWdnaW5nIG9wdGlvblxuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbWVtYmVyLW9yZGVyaW5nXG4gIHByaXZhdGUgc3RhdGljIGdldE5ld0FycmF5TGVuZ3RoKFxuICAgIGxlbmd0aDogbnVtYmVyLFxuICAgIG92ZXJhbGxTaXplOiBudW1iZXIsXG4gICAgc2l6ZTogbnVtYmVyXG4gICk6IG51bWJlciB7XG4gICAgY29uc3QgbmV3TGVuZ3RoID0gTWF0aC5tYXgobGVuZ3RoLCBNYXRoLmZsb29yKG92ZXJhbGxTaXplIC8gc2l6ZSkpO1xuXG4gICAgaWYgKG5ld0xlbmd0aCA8IDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGlmIChOdW1iZXIuaXNGaW5pdGUobmV3TGVuZ3RoKSkge1xuICAgICAgcmV0dXJuIE1hdGguZmxvb3IobmV3TGVuZ3RoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxufVxuIiwiPGRpdlxuICBjbGFzcz1cImdyaWRzdGVyLWNvbHVtblwiXG4gICpuZ0Zvcj1cImxldCBjb2x1bW4gb2YgZ3JpZENvbHVtbnM7IGxldCBpID0gaW5kZXg7XCJcbiAgW25nU3R5bGVdPVwiZ3JpZFJlbmRlcmVyLmdldEdyaWRDb2x1bW5TdHlsZShpKVwiXG4+PC9kaXY+XG48ZGl2XG4gIGNsYXNzPVwiZ3JpZHN0ZXItcm93XCJcbiAgKm5nRm9yPVwibGV0IHJvdyBvZiBncmlkUm93czsgbGV0IGkgPSBpbmRleDtcIlxuICBbbmdTdHlsZV09XCJncmlkUmVuZGVyZXIuZ2V0R3JpZFJvd1N0eWxlKGkpXCJcbj48L2Rpdj5cbjxuZy1jb250ZW50PjwvbmctY29udGVudD5cbjxncmlkc3Rlci1wcmV2aWV3XG4gIFtncmlkUmVuZGVyZXJdPVwiZ3JpZFJlbmRlcmVyXCJcbiAgW3ByZXZpZXdTdHlsZSRdPVwicHJldmlld1N0eWxlJFwiXG4gIGNsYXNzPVwiZ3JpZHN0ZXItcHJldmlld1wiXG4+PC9ncmlkc3Rlci1wcmV2aWV3PlxuIl19