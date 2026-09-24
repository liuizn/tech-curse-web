import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MatriculaService {
  private readonly http = inject(HttpClient);

  async matricular(courseId: number, studentId: number): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/Enrollment`, { courseId, studentId }),
    );
  }
}
