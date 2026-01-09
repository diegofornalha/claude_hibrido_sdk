import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    @switch (variant) {
      @case ('text') {
        <div class="space-y-2">
          @for (line of lines; track $index) {
            <div
              class="h-4 skeleton"
              [style.width]="getLineWidth($index)"
            ></div>
          }
        </div>
      }
      @case ('avatar') {
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 skeleton rounded-full"></div>
          <div class="space-y-2 flex-1">
            <div class="h-4 skeleton w-3/4"></div>
            <div class="h-3 skeleton w-1/2"></div>
          </div>
        </div>
      }
      @case ('card') {
        <div class="bg-white rounded-lg p-4 shadow space-y-3">
          <div class="h-5 skeleton w-2/3"></div>
          <div class="space-y-2">
            <div class="h-4 skeleton"></div>
            <div class="h-4 skeleton w-5/6"></div>
          </div>
        </div>
      }
      @case ('chat-list') {
        <div class="space-y-3 p-4">
          @for (item of items; track $index) {
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 skeleton rounded-full"></div>
              <div class="flex-1 space-y-2">
                <div class="h-4 skeleton w-3/4"></div>
                <div class="h-3 skeleton w-1/2"></div>
              </div>
            </div>
          }
        </div>
      }
      @case ('stats') {
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          @for (item of items; track $index) {
            <div class="bg-white rounded-lg p-4 shadow">
              <div class="h-3 skeleton w-1/2 mb-2"></div>
              <div class="h-8 skeleton w-3/4"></div>
            </div>
          }
        </div>
      }
      @case ('table') {
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <div class="h-12 skeleton border-b"></div>
          @for (row of items; track $index) {
            <div class="h-14 border-b flex items-center gap-4 px-4">
              <div class="h-4 skeleton flex-1"></div>
              <div class="h-4 skeleton w-24"></div>
              <div class="h-4 skeleton w-20"></div>
            </div>
          }
        </div>
      }
      @case ('diagnosis-card') {
        <div class="bg-white rounded-lg p-6 shadow-lg space-y-4">
          <div class="h-6 skeleton w-2/3 mb-4"></div>
          <div class="space-y-3">
            <div class="h-4 skeleton"></div>
            <div class="h-4 skeleton w-5/6"></div>
            <div class="h-4 skeleton w-4/6"></div>
          </div>
          <div class="pt-4 border-t">
            <div class="h-10 skeleton w-32"></div>
          </div>
        </div>
      }
      @case ('user-detail') {
        <div class="bg-white rounded-lg p-6 shadow space-y-4">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-16 h-16 skeleton rounded-full"></div>
            <div class="flex-1 space-y-2">
              <div class="h-5 skeleton w-1/2"></div>
              <div class="h-4 skeleton w-1/3"></div>
            </div>
          </div>
          <div class="space-y-3">
            @for (item of items; track $index) {
              <div class="flex gap-3">
                <div class="h-4 skeleton w-24"></div>
                <div class="h-4 skeleton flex-1"></div>
              </div>
            }
          </div>
        </div>
      }
      @case ('form') {
        <div class="bg-white rounded-lg p-6 shadow space-y-4">
          @for (item of items; track $index) {
            <div class="space-y-2">
              <div class="h-4 skeleton w-32"></div>
              <div class="h-10 skeleton"></div>
            </div>
          }
          <div class="pt-4">
            <div class="h-10 skeleton w-32"></div>
          </div>
        </div>
      }
      @default {
        <div class="flex items-center justify-center p-4">
          <div class="space-y-3 w-full max-w-sm">
            <div class="h-4 skeleton"></div>
            <div class="h-4 skeleton w-5/6"></div>
            <div class="h-4 skeleton w-4/6"></div>
          </div>
        </div>
      }
    }
  `
})
export class SkeletonComponent {
  @Input() variant: 'text' | 'avatar' | 'card' | 'chat-list' | 'stats' | 'table' | 'diagnosis-card' | 'user-detail' | 'form' | 'default' = 'default';
  @Input() count: number = 3;

  get lines(): number[] {
    return Array(this.count).fill(0);
  }

  get items(): number[] {
    return Array(this.count).fill(0);
  }

  getLineWidth(index: number): string {
    const widths = ['100%', '90%', '75%', '85%', '60%'];
    return widths[index % widths.length];
  }
}
