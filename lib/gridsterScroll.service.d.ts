import { GridsterResizeEventType } from './gridsterResizeEventType.interface';
import { GridsterComponentInterface } from './gridster.interface';
type Position = Pick<MouseEvent, 'clientX' | 'clientY'>;
type CalculatePosition = (position: Position) => void;
export declare function scroll(gridster: GridsterComponentInterface, left: number, top: number, width: number, height: number, event: MouseEvent, lastMouse: Position, calculateItemPosition: CalculatePosition, resize?: boolean, resizeEventScrollType?: GridsterResizeEventType): void;
export declare function cancelScroll(): void;
export {};
