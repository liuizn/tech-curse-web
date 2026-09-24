import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AlunoApiService {
  private readonly http = inject(HttpClient);

  async atualizarNome(id: number, nome: string): Promise<void> {
    await firstValueFrom(this.http.put(`${environment.apiUrl}/Student/${id}`, { nome }));
  }
}
