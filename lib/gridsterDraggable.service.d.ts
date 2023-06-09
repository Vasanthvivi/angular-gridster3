import { NgZone } from '@angular/core';
import { GridsterComponentInterface } from './gridster.interface';
import { GridsterItemComponentInterface } from './gridsterItem.interface';
import { GridsterPush } from './gridsterPush.service';
import { GridsterSwap } from './gridsterSwap.service';
export declare class GridsterDraggable {
    private zone;
    gridsterItem: GridsterItemComponentInterface;
    gridster: GridsterComponentInterface;
    lastMouse: {
        clientX: number;
        clientY: number;
    };
    offsetLeft: number;
    offsetTop: number;
    margin: number;
    outerMarginTop: number | null;
    outerMarginRight: number | null;
    outerMarginBottom: number | null;
    outerMarginLeft: number | null;
    diffTop: number;
    diffLeft: number;
    originalClientX: number;
    originalClientY: number;
    top: number;
    left: number;
    height: number;
    width: number;
    positionX: number;
    positionY: number;
    positionXBackup: number;
    positionYBackup: number;
    enabled: boolean;
    mousemove: () => void;
    mouseup: () => void;
    mouseleave: () => void;
    cancelOnBlur: () => void;
    touchmove: () => void;
    touchend: () => void;
    touchcancel: () => void;
    mousedown: () => void;
    touchstart: () => void;
    push: GridsterPush;
    swap: GridsterSwap;
    path: Array<{
        x: number;
        y: number;
    }>;
    collision: GridsterItemComponentInterface | boolean;
    constructor(gridsterItem: GridsterItemComponentInterface, gridster: GridsterComponentInterface, zone: NgZone);
    destroy(): void;
    dragStart(e: MouseEvent): void;
    dragMove: (e: MouseEvent) => void;
    calculateItemPositionFromMousePosition: (e: MouseEvent) => void;
    calculateItemPositionWithScale(e: MouseEvent, scale: number): void;
    calculateItemPositionWithoutScale(e: MouseEvent): void;
    dragStop: (e: MouseEvent) => void;
    cancelDrag: () => void;
    makeDrag: () => void;
    calculateItemPosition(): void;
    toggle(): void;
    dragStartDelay: (e: MouseEvent) => void;
    /**
     * Returns the list of directions for given mouse event
     * @param e Mouse event
     * */
    private getDirections;
}
