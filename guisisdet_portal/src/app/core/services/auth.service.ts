import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EPs } from '../../global/endPoint';
import { Constants } from '../../global/Constants';
import { ContextoPatronalService, RegistroPatronal } from './contexto-patronal.service';
import { ModalService } from '../../shared/services/modal.service';


export interface AuthResponse {
  token: string;
  refreshToken: string;
}


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private LOGIN_URL = `${environment.seguridadApiUrl}${EPs.oauth.login}`;
  private tokenKey = Constants.tokenKey;

  private REFRESH_URL = `${environment.seguridadApiUrl}${EPs.oauth.refresh}`;
  private refreshTokenKey = Constants.refreshTokenKey;
  private timeoutId:any;



  constructor(
    private httpClient: HttpClient,
    private router: Router,
    private contextoPatronalService: ContextoPatronalService,
    private modalService: ModalService 
  ) { }

  login(user: string, password: string, tipoAuth: string): Observable<any>{
      console.log("entro en login(user: string, password:");
    return this.httpClient.post<any>(this.LOGIN_URL, { user, password,tipoAuth }).pipe(
      tap(response => {
        if (response.token) {
          this.setToken(response.token);
          this.setRefreshToken(response.refreshToken);
          this.actualizarContextoDesdeToken(response.token);
          this.autoRefreshToken();
        }
      }),

      catchError(this.handleError)
    );
  }

private handleError(error: HttpErrorResponse) {
  // Simplemente relanza el objeto HttpErrorResponse completo.
  // El componente se encargará de interpretarlo.
  return throwError(() => error);
}

  private setToken(token: string): void {
    sessionStorage.setItem(this.tokenKey, token);
  }

  public getToken(): string | null {
    if(typeof window !== 'undefined'){
      return sessionStorage.getItem(this.tokenKey);
    }else {
      return null;
    }
  }

  private setRefreshToken(token: string): void {
    sessionStorage.setItem(this.refreshTokenKey, token);
  }

  private getRefreshToken(): string | null {
    if(typeof window !== 'undefined'){
      return sessionStorage.getItem(this.refreshTokenKey);
    }else {
      return null;
    }
  }



  refreshToken(): Observable<AuthResponse | null> {
    const refreshToken = this.getRefreshToken();
    console.log("refreshToken: " + refreshToken);
    console.log("this.REFRESH_URL: " + this.REFRESH_URL);

    if (!refreshToken) {
      console.log("El refreshToken es null o undefined, no se hará la petición.");
      // Limpiar y redirigir si no hay refresh token, podría ser una sesión expirada.
      this.logout();
      return of(null);
    }

    //Prepara el cuerpo de la petición para incluir el registro patronal actual.
    const registroActual = this.contextoPatronalService.valorActual;
    const body = {
      refreshToken: refreshToken,
      // Si hay un registro patronal en el contexto, lo enviamos. Si no, enviamos null.
      registroPatronal: registroActual ? registroActual.registroPatronal : null
    };

    return this.httpClient.post<AuthResponse>(this.REFRESH_URL, body).pipe(
      tap(response => {
        if (response && response.token) {
          this.setToken(response.token);
          this.setRefreshToken(response.refreshToken);
          
          // NUEVO: Actualiza el contexto también después de cada refresh.
          this.actualizarContextoDesdeToken(response.token);

          this.autoRefreshToken();
        }
      }),
      catchError((error) => {
        // Si el refresh token falla (p.ej., ha expirado), desloguear al usuario.
        console.error("Error al refrescar el token, cerrando sesión.", error);
        this.logout();
        return throwError(() => error);
      })
    );
  }



    /**
   * Decodifica el token JWT, busca el claim 'registroPatronal' y actualiza
   * el ContextoPatronalService si lo encuentra.
   * @param token El token JWT a procesar.
   */
  actualizarContextoDesdeToken(token: string | null): void {
    if (!token) {
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      if (payload.registroPatronal) {
        console.log("Registro Patronal encontrado en el token:", payload.registroPatronal);
        const rpDesdeToken: RegistroPatronal = {
          registroPatronal: payload.registroPatronal,
          // Puedes añadir más campos si los incluyes en el token, como el nombre del patrón.
          // nombre: payload.nombrePatronal 
        };
        // Llama al servicio de contexto para que actualice su estado y notifique a toda la app.
        this.contextoPatronalService.seleccionarRegistro(rpDesdeToken);
      }/* else {
        //Nota: pendiente implentar que el RP este en el token
        this.contextoPatronalService.limpiarRegistro();
        console.log("No se encontró un Registro Patronal en el token.");
      }*/
    } catch (error) {
      console.error("No se pudo decodificar el token JWT:", error);
    }
  }



  autoRefreshToken(): void {
    // Cancelar cualquier timeout anterior para evitar múltiples ejecuciones
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    console.log("autoRefreshToken");
    const token = this.getToken();
    if (!token) {
      return;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000;
    const currentTime = Date.now();
    const timeLeft = expirationTime - currentTime;

    // Renovar 1 minuto antes de la expiración. No renovar si queda menos de eso.
    if (timeLeft <= 60000) {
      console.log("El token expira en menos de un minuto, no se programará la renovación automática.");
      return;
    }
    
    const refreshTime = timeLeft - 60000;
    console.log(`Próxima renovación de token en ${Math.round(refreshTime / 1000 / 60)} minutos.`);

    this.timeoutId = setTimeout(() => {
      console.log("Ejecutando refreshToken automático...");
      this.refreshToken().subscribe({
        next: () => console.log("Token refrescado automáticamente con éxito."),
        error: err => console.error("Falló la renovación automática del token.", err)
      });
    }, refreshTime);
  }

 

    isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;
      return Date.now() < exp;
    } catch (e) {
      return false; // Token malformado
    }
  }




  logout(): void {
    console.log("Cerrando sesión...");

    this.modalService.close();
    this.contextoPatronalService.limpiarRegistro();

    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.refreshTokenKey);
    Opcional: sessionStorage.clear();  

    // Cancelar el refresco automático programado
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.router.navigate(['/login']);
  }





  /**
   * Método para inicializar el estado de la sesión al cargar la aplicación.
   * Este método debe ser llamado desde AppComponent.ngOnInit().
   */
  iniciarYRestaurarSesion(): void {
    console.log("AuthService: Verificando e inicializando sesión...");

    // Comprueba si el usuario tiene un token válido y no expirado.
    if (this.isAuthenticated()) {
      console.log("Sesión válida encontrada. Restaurando contexto y programando refresh...");
      
      // 1. Obtiene el token actual del sessionStorage.
      const token = this.getToken();
      
      // 2. Restaura el contexto (registroPatronal) desde ese token.
      this.actualizarContextoDesdeToken(token);
      
      // 3. Programa la renovación automática para el futuro.
      this.autoRefreshToken();

    } else {
      console.log("No se encontró una sesión válida.");
      // Opcional: Podrías hacer una limpieza por si quedaron datos corruptos.
        this.logout();
    }
  }


}
