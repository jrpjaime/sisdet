import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { SharedService } from '../../../shared/services/shared.service';
import { NAV } from '../../../global/navigation';
import { Constants } from '../../../global/Constants';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertService } from '../../../shared/services/alert.service';
import { LoaderService } from '../../../shared/services/loader.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  loginForm: FormGroup;
  role: string = '';
  activeTab: 'login' | 'firma' = 'firma';
  errorMessage: string | null = null;

  // Constante para la URL del widget de firma
  // private URL_FIRMA_DIGITAL = "http://172.16.23.224";

  // Propiedades para el widget de firma
  widgetUrl: SafeResourceUrl | undefined;
  @ViewChild('formWidget') formWidget!: ElementRef<HTMLFormElement>;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private sharedService: SharedService,
    private router: Router,
    private sanitizer: DomSanitizer,
     public alertService: AlertService,
     private loaderService: LoaderService,
    private cdRef: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      user: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}\d{6}[A-Z]{6}\d{2}$/)]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Sanitizar la URL del widget para el iframe
   // this.widgetUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`${this.URL_FIRMA_DIGITAL}/firmaElectronicaWeb/widget/chfecyn`);
    this.widgetUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`${environment.firmaDigitalUrl}/firmaElectronicaWeb/widget/chfecyn`);
  }

  ngAfterViewInit(): void {
    // Si la pestaña por defecto es 'firma', enviar el formulario para cargar el widget
    if (this.activeTab === 'firma') {
      // Usamos un pequeño timeout para asegurar que la vista esté completamente renderizada
      setTimeout(() => {
        if (this.formWidget) {
          this.formWidget.nativeElement.submit();
        }
      }, 0);
    }
  }

  // Escucha los mensajes del iframe
  @HostListener('window:message', ['$event'])
  onMessage(event: MessageEvent): void {
    // Validar el origen para seguridad si es posible
    // if (event.origin !== this.URL_FIRMA_DIGITAL) {
    //   console.warn("Mensaje recibido de un origen no confiable:", event.origin);
    //   return;
    // }
    this.respuestaCHFECyN(event);
  }

  login(): void {
     this.errorMessage = null;
     console.log("entro en login");
    if (this.loginForm.valid) {
      const { user, password } = this.loginForm.value;
      this.loaderService.showLoader();
      this.authService.login(user, password,"login").subscribe({
        next: (response) => {
          this.sharedService.initializeUserData();
          this.sharedService.currentRole.subscribe(role => {
            this.role = role;
            if (this.role === Constants.rolePatron) {
              this.router.navigate([NAV.home]);
            } else {
              this.router.navigate([NAV.login]);
            }
          });
        },
     error: (err: HttpErrorResponse) => { 
        console.error('Objeto de Error Recibido:', err);

        // Verificamos si la propiedad 'error' contiene el string de tu backend
        if (err.error && typeof err.error === 'string') {
          // ¡Aquí está tu mensaje! Asignamos el contenido del cuerpo del error.
          this.errorMessage = err.error;  
        
        } else if (err.status === 0) {
          // Manejo de errores de conexión (servidor no alcanzable)
          
            
          this.errorMessage = 'Servicio no disponible. Reintente mas tarde';
          this.alertService.error( this.errorMessage);

        } else {
          // Fallback para otros errores inesperados
          this.errorMessage = 'Credenciales incorrectas o ha ocurrido un error inesperado.';
          this.alertService.error( this.errorMessage);
        }
      },
      complete:() => {
        this.loaderService.closeLoader();
      }


      });
    }
  }





  // Cambia la pestaña activa
  setActiveTab(tab: 'login' | 'firma'): void {
    this.errorMessage = null;
    this.activeTab = tab;
    // Si la pestaña de firma se activa, enviar el formulario para cargar el iframe
    if (this.activeTab === 'firma') {
        this.cdRef.detectChanges(); // Asegurar que el ViewChild esté disponible
        if (this.formWidget) {
            this.formWidget.nativeElement.submit();
        }
    }
  }

  // Lógica de la función respuestaCHFECyN
  private respuestaCHFECyN(respuestaEvento: any): void {
    try {
      const data = respuestaEvento.data;
      const resultadoJSON = JSON.parse(data);

      if (resultadoJSON.resultado == 0) {
        this.errorMessage = null;
        let rfcRazonSocial: string;
        let rfcFirma: string;
        if (resultadoJSON.nombreRazonSocial) {
          // La lógica original usaba rfc;nombre;curp. La adaptamos.
          rfcRazonSocial = `${resultadoJSON.rfc};${resultadoJSON.rfc};${resultadoJSON.curp || ''}`;
        } else {
          rfcRazonSocial = `${resultadoJSON.rfc}; ;${resultadoJSON.curp || ''}`;
        }

        if (resultadoJSON.rfc) {
          rfcFirma=resultadoJSON.rfc;
        }else{
          rfcFirma='';
        }



        const cadenaCodificada = rfcFirma;
       // const cadenaCodificada = this.b64EncodeUnicode(rfcRazonSocial);

        // Llamar al servicio de autenticación con los datos procesados
        // Se asume que el backend puede manejar este tipo de credenciales.
        // El primer parámetro es el usuario y el segundo la contraseña.
        this.authService.login(cadenaCodificada, rfcRazonSocial, "firma").subscribe({
            next: (response) => {
              this.sharedService.initializeUserData();
              this.sharedService.currentRole.subscribe(role => {
                this.role = role;
                if (this.role === Constants.rolePatron) {
                    this.router.navigate([NAV.home]);
                } else {
                    this.router.navigate([NAV.login]);
                }
              });
            },
              error: (err: HttpErrorResponse) => {
                 
                  console.error('Objeto de Error Recibido:', err);

                  // Verificamos si la propiedad 'error' contiene el string de tu backend
                  if (err.error && typeof err.error === 'string') {
                    // ¡Aquí está tu mensaje! Asignamos el contenido del cuerpo del error.
                    this.errorMessage = err.error; // <-- Asignará "Error Authetication"
                  
                  } else if (err.status === 0) {
                    // Manejo de errores de conexión (servidor no alcanzable)
                    this.errorMessage = 'Servicio no disponible. Reintente mas tarde';
                    this.alertService.error( this.errorMessage);
                  } else {
                    // Fallback para otros errores inesperados
                    this.errorMessage = 'Credenciales incorrectas o ha ocurrido un error inesperado.';
                    this.alertService.error( this.errorMessage);
                  }
                },
                complete:() => {
                  this.loaderService.closeLoader();
                }
        });

      } else {
        console.error("Error recibido desde el widget de firma:", resultadoJSON);

      }
    } catch (error) {
      console.error("Error al procesar la respuesta del widget de firma:", error);
    }
  }

  // Función para codificar en Base64 Unicode
  private b64EncodeUnicode(str: string): string {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      function toSolidBytes(match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
      }));
  }

  ngOnDestroy(): void {
    // Limpiar el listener si es necesario, aunque HostListener lo hace automáticamente.
  }
}
