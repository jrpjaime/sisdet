package mx.gob.imss.seguridad.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import mx.gob.imss.seguridad.entity.SdtUsuario;
import io.jsonwebtoken.io.Decoders;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.function.Function;

@Service
public class JwtUtilService {

    @Value("${jwt.secret}")
    private String JWT_SECRET_KEY;

    // Puedes considerar usar Duration para mayor claridad y seguridad de tipos
    // private static final Duration JWT_TIME_VALIDITY = Duration.ofMinutes(60);
    private static final long JWT_TIME_VALIDITY = 1000 * 60 * 60; // 60 minutos
    private static final long JWT_TIME_REFRESH_VALIDATE = 1000 * 60 * 60 * 24; // 24 horas

    // Genera el token JWT
    public String generateToken(UserDetails userDetails, String role, SdtUsuario sdtUsuario, String registroPatronal) {
        var claims = new HashMap<String, Object>();
        claims.put("rfc", sdtUsuario.getRefRfc());
        claims.put("nombre", sdtUsuario.getNomNombre());
        claims.put("primerApellido", sdtUsuario.getNomApellidoPaterno());
        claims.put("segundoApellido", sdtUsuario.getNomApellidoMaterno());
        // claims.put("desDelegacion", sdtUsuario.getDesDelegacion());
        // claims.put("desSubdelegacion", sdtUsuario.getDesSubdelegacion());
        claims.put("role", role);
        claims.put("terminosAceptados", sdtUsuario.getFecAceptaTerminos() != null);

        if (registroPatronal != null && !registroPatronal.isEmpty()) {
            claims.put("registroPatronal", registroPatronal);
        }

        return Jwts.builder()
                .claims(claims) // Nuevo método para establecer los claims
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + JWT_TIME_VALIDITY))
                .signWith(getSignInKey(), Jwts.SIG.HS256)
                .compact();
    }

    // Genera el refresh token
    public String generateRefreshToken(UserDetails userDetails, String role, SdtUsuario sdtUsuario, String registroPatronal) {
        var claims = new HashMap<String, Object>();
        claims.put("rfc", sdtUsuario.getRefRfc());
        claims.put("nombre", sdtUsuario.getNomNombre());
        claims.put("primerApellido", sdtUsuario.getNomApellidoPaterno());
        claims.put("segundoApellido", sdtUsuario.getNomApellidoMaterno());
        // claims.put("desDelegacion", sdtUsuario.getDesDelegacion());
        // claims.put("desSubdelegacion", sdtUsuario.getDesSubdelegacion());
        claims.put("role", role);

        if (registroPatronal != null && !registroPatronal.isEmpty()) {
            claims.put("registroPatronal", registroPatronal);
        }
        return Jwts.builder()
                .claims(claims) // Nuevo método para establecer los claims
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + JWT_TIME_REFRESH_VALIDATE))
                .signWith(getSignInKey(), Jwts.SIG.HS256)
                .compact();
    }

    // Método para obtener la clave de firma segura
    private SecretKey getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(JWT_SECRET_KEY);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    // Valida el token
    public boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractClaim(token, Claims::getSubject);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

    // Extrae los claims de un token
    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    // Extrae todos los claims del token
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignInKey()) // Usa verifyWith en lugar de setSigningKey y parseClaimsJws().getBody()
                .build()
                .parseSignedClaims(token) // Nuevo método para parsear claims
                .getPayload(); // Obtiene el payload directamente
    }

    // Verifica si el token ha expirado
    private Boolean isTokenExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }

    // Extrae el nombre de usuario del token
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }
}