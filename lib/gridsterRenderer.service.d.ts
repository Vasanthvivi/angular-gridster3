import { Renderer2 } from '@angular/core';
import { GridsterComponentInterface } from './gridster.interface';
import { GridsterItem } from './gridsterItem.interface';
import { CommonGridStyle } from './gridsterRenderer.interface';
export declare class GridsterRenderer {
    private gridster;
    /**
     * Caches the last grid column styles.
     * This improves the grid responsiveness by caching and reusing the last style object instead of creating a new one.
     */
    private lastGridColumnStyles;
    /**
     * Caches the last grid column styles.
     * This improves the grid responsiveness by caching and reusing the last style object instead of creating a new one.
     */
    private lastGridRowStyles;
    constructor(gridster: GridsterComponentInterface);
    destroy(): void;
    updateItem(el: Element, item: GridsterItem, renderer: Renderer2): void;
    updateGridster(): void;
    getGridColumnStyle(i: number): CommonGridStyle;
    getGridRowStyle(i: number): CommonGridStyle;
    getLeftPosition(d: number): {
        left: string;
    } | {
        transform: string;
    };
    getTopPosition(d: number): {
        top: string;
    } | {
        transform: string;
    };
    clearCellPosition(renderer: Renderer2, el: Element): void;
    setCellPosition(renderer: Renderer2, el: Element, x: number, y: number): void;
    getLeftMargin(): number;
    getTopMargin(): number;
}
