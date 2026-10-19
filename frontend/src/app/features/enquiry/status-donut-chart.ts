import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  Injector,
  NgZone,
  viewChild,
} from '@angular/core';
import * as am5 from '@amcharts/amcharts5';
import * as am5percent from '@amcharts/amcharts5/percent';

export interface StatusChartItem {
  name: string;
  count: number;
  color: string;
}

@Component({
  selector: 'app-status-donut-chart',
  templateUrl: './status-donut-chart.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusDonutChart {
  readonly data = input.required<StatusChartItem[]>();
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('chart');
  private readonly zone = inject(NgZone);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private root: am5.Root | null = null;
  private series: am5percent.PieSeries | null = null;

  constructor() {
    afterNextRender(() => {
      this.zone.runOutsideAngular(() => this.createChart());
      effect(() => this.updateChart(this.data()), { injector: this.injector });
    });
    this.destroyRef.onDestroy(() => this.root?.dispose());
  }

  private createChart(): void {
    this.root = am5.Root.new(this.host().nativeElement);
    const chart = this.root.container.children.push(
      am5percent.PieChart.new(this.root, {
        innerRadius: am5.percent(64),
        layout: this.root.verticalLayout,
      }),
    );
    this.series = chart.series.push(
      am5percent.PieSeries.new(this.root, {
        categoryField: 'name',
        valueField: 'count',
        alignLabels: false,
        tooltip: am5.Tooltip.new(this.root, { labelText: '{name}: {count}' }),
      }),
    );
    this.series.slices.template.setAll({
      templateField: 'sliceSettings',
      stroke: am5.color(0xffffff),
      strokeWidth: 2,
    });
    this.series.labels.template.set('forceHidden', true);
    this.series.ticks.template.set('forceHidden', true);
    const legend = chart.children.push(
      am5.Legend.new(this.root, {
        centerX: am5.percent(50),
        x: am5.percent(50),
        layout: this.root.gridLayout,
      }),
    );
    this.series.events.on('datavalidated', () => legend.data.setAll(this.series?.dataItems ?? []));
  }

  private updateChart(data: StatusChartItem[]): void {
    this.series?.data.setAll(
      data.map((item) => ({
        ...item,
        sliceSettings: { fill: am5.color(item.color) },
      })),
    );
  }
}
