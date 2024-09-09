FROM python:3

WORKDIR /usr/src/app

COPY . .
RUN ls -lah
RUN pip install --no-cache-dir -r requirements.txt
RUN ls -lah

CMD [ "python", "./run.py" ]
