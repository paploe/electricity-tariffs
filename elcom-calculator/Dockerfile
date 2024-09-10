FROM python:3

WORKDIR /usr/src/app

COPY . .
RUN ls -lah
RUN echo "Current dir:"
RUN pwd
RUN pip install -r requirements.txt
RUN ls -lah

CMD [ "python", "./run.py" ]
