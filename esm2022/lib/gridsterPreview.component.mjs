import { Component, ElementRef, EventEmitter, Input, Renderer2, ViewEncapsulation } from '@angular/core';
import { GridsterRenderer } from './gridsterRenderer.service';
import * as i0 from "@angular/core";
class GridsterPreviewComponent {
    constructor(el, renderer) {
        this.renderer = renderer;
        this.el = el.nativeElement;
    }
    ngOnInit() {
        this.sub = this.previewStyle$.subscribe(options => this.previewStyle(options));
    }
    ngOnDestroy() {
        if (this.sub) {
            this.sub.unsubscribe();
        }
    }
    previewStyle(item) {
        if (item) {
            this.renderer.setStyle(this.el, 'display', 'block');
            this.gridRenderer.updateItem(this.el, item, this.renderer);
        }
        else {
            this.renderer.setStyle(this.el, 'display', '');
        }
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0", ngImport: i0, type: GridsterPreviewComponent, deps: [{ token: i0.ElementRef }, { token: i0.Renderer2 }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "16.0.0", type: GridsterPreviewComponent, isStandalone: true, selector: "gridster-preview", inputs: { previewStyle$: "previewStyle$", gridRenderer: "gridRenderer" }, ngImport: i0, template: '', isInline: true, styles: ["gridster-preview{position:absolute;display:none;background:rgba(0,0,0,.15)}\n"], encapsulation: i0.ViewEncapsulation.None }); }
}
export { GridsterPreviewComponent };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0", ngImport: i0, type: GridsterPreviewComponent, decorators: [{
            type: Component,
            args: [{ selector: 'gridster-preview', template: '', encapsulation: ViewEncapsulation.None, standalone: true, styles: ["gridster-preview{position:absolute;display:none;background:rgba(0,0,0,.15)}\n"] }]
        }], ctorParameters: function () { return [{ type: i0.ElementRef }, { type: i0.Renderer2 }]; }, propDecorators: { previewStyle$: [{
                type: Input
            }], gridRenderer: [{
                type: Input
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JpZHN0ZXJQcmV2aWV3LmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Byb2plY3RzL2FuZ3VsYXItZ3JpZHN0ZXIyL3NyYy9saWIvZ3JpZHN0ZXJQcmV2aWV3LmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsU0FBUyxFQUNULFVBQVUsRUFDVixZQUFZLEVBQ1osS0FBSyxFQUdMLFNBQVMsRUFDVCxpQkFBaUIsRUFDbEIsTUFBTSxlQUFlLENBQUM7QUFHdkIsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7O0FBRTlELE1BT2Esd0JBQXdCO0lBTW5DLFlBQVksRUFBYyxFQUFVLFFBQW1CO1FBQW5CLGFBQVEsR0FBUixRQUFRLENBQVc7UUFDckQsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDO0lBQzdCLENBQUM7SUFFRCxRQUFRO1FBQ04sSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUNoRCxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUMzQixDQUFDO0lBQ0osQ0FBQztJQUVELFdBQVc7UUFDVCxJQUFHLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDWCxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDO1NBQ3hCO0lBQ0gsQ0FBQztJQUVPLFlBQVksQ0FBQyxJQUF5QjtRQUM1QyxJQUFJLElBQUksRUFBRTtZQUNSLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3BELElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUM1RDthQUFNO1lBQ0wsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7U0FDaEQ7SUFDSCxDQUFDOzhHQTdCVSx3QkFBd0I7a0dBQXhCLHdCQUF3QixzSkFMekIsRUFBRTs7U0FLRCx3QkFBd0I7MkZBQXhCLHdCQUF3QjtrQkFQcEMsU0FBUzsrQkFDRSxrQkFBa0IsWUFDbEIsRUFBRSxpQkFFRyxpQkFBaUIsQ0FBQyxJQUFJLGNBQ3pCLElBQUk7eUhBR1AsYUFBYTtzQkFBckIsS0FBSztnQkFDRyxZQUFZO3NCQUFwQixLQUFLIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgQ29tcG9uZW50LFxuICBFbGVtZW50UmVmLFxuICBFdmVudEVtaXR0ZXIsXG4gIElucHV0LFxuICBPbkRlc3Ryb3ksXG4gIE9uSW5pdCxcbiAgUmVuZGVyZXIyLFxuICBWaWV3RW5jYXBzdWxhdGlvblxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IFN1YnNjcmlwdGlvbiB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgR3JpZHN0ZXJJdGVtIH0gZnJvbSAnLi9ncmlkc3Rlckl0ZW0uaW50ZXJmYWNlJztcbmltcG9ydCB7IEdyaWRzdGVyUmVuZGVyZXIgfSBmcm9tICcuL2dyaWRzdGVyUmVuZGVyZXIuc2VydmljZSc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2dyaWRzdGVyLXByZXZpZXcnLFxuICB0ZW1wbGF0ZTogJycsXG4gIHN0eWxlVXJsczogWycuL2dyaWRzdGVyUHJldmlldy5jc3MnXSxcbiAgZW5jYXBzdWxhdGlvbjogVmlld0VuY2Fwc3VsYXRpb24uTm9uZSxcbiAgc3RhbmRhbG9uZTogdHJ1ZVxufSlcbmV4cG9ydCBjbGFzcyBHcmlkc3RlclByZXZpZXdDb21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQsIE9uRGVzdHJveSB7XG4gIEBJbnB1dCgpIHByZXZpZXdTdHlsZSQ6IEV2ZW50RW1pdHRlcjxHcmlkc3Rlckl0ZW0gfCBudWxsPjtcbiAgQElucHV0KCkgZ3JpZFJlbmRlcmVyOiBHcmlkc3RlclJlbmRlcmVyO1xuICBwcml2YXRlIGVsOiBIVE1MRWxlbWVudDtcbiAgcHJpdmF0ZSBzdWI6IFN1YnNjcmlwdGlvbjtcblxuICBjb25zdHJ1Y3RvcihlbDogRWxlbWVudFJlZiwgcHJpdmF0ZSByZW5kZXJlcjogUmVuZGVyZXIyKSB7XG4gICAgdGhpcy5lbCA9IGVsLm5hdGl2ZUVsZW1lbnQ7XG4gIH1cblxuICBuZ09uSW5pdCgpOiB2b2lkIHtcbiAgICB0aGlzLnN1YiA9IHRoaXMucHJldmlld1N0eWxlJC5zdWJzY3JpYmUob3B0aW9ucyA9PlxuICAgICAgdGhpcy5wcmV2aWV3U3R5bGUob3B0aW9ucylcbiAgICApO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgaWYodGhpcy5zdWIpIHtcbiAgICAgIHRoaXMuc3ViLnVuc3Vic2NyaWJlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwcmV2aWV3U3R5bGUoaXRlbTogR3JpZHN0ZXJJdGVtIHwgbnVsbCk6IHZvaWQge1xuICAgIGlmIChpdGVtKSB7XG4gICAgICB0aGlzLnJlbmRlcmVyLnNldFN0eWxlKHRoaXMuZWwsICdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICB0aGlzLmdyaWRSZW5kZXJlci51cGRhdGVJdGVtKHRoaXMuZWwsIGl0ZW0sIHRoaXMucmVuZGVyZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJlbmRlcmVyLnNldFN0eWxlKHRoaXMuZWwsICdkaXNwbGF5JywgJycpO1xuICAgIH1cbiAgfVxufVxuIl19