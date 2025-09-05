# Usa Nginx para servir os arquivos estáticos
FROM nginx:alpine

# Copia todos os arquivos do projeto para a pasta padrão do Nginx
COPY ./ /usr/share/nginx/html/

# Expõe a porta 80 (HTTP)
EXPOSE 80
