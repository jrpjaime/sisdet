# Usar una imagen base con Java 17
FROM openjdk:17-slim

# Directorio donde se colocará la aplicación en el contenedor
WORKDIR /app

# Copiar el archivo jar del proyecto al directorio /app en el contenedor
COPY target/mssisdet-catalogos-0.0.1-SNAPSHOT.jar /app/mssisdet-catalogos.jar

# Exponer el puerto que usa la aplicación
EXPOSE 5010

# Comando para ejecutar la aplicación
CMD ["java", "-jar", "/app/mssisdet-catalogos.jar"]
