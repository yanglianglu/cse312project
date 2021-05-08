FROM node:13

ENV HOME /root
WORKDIR  /root

COPY . .

EXPOSE 8000 

ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.2.1/wait /wait
RUN chmod +x /wait 

CMD /wait && node server.js