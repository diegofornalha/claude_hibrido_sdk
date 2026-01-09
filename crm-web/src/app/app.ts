import { Component, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('crm-web');
  private readonly router = inject(Router);

  navigateToChat(): void {
    this.router.navigate(['/chat']);
  }
}
