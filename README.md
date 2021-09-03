# Утилита для простой настройки SymmetricDS с ПО PERCo-Web

Перед работой с утилитой прочтите список рекомендаций и требований:
* Для работы SymmetricDS необходимо установить Open JDK на все сервера
* Данную утилиту необходимо ставить на мастер-сервер (настройка единоразовая)
* Обязательно полностью установите PERCo-Web или обновить до последней версии, запустите и выполните первый вход (если это первая установка).
* Передайте секретный ключ на каждый сегмент
* Во время запуска установки SymmetricDS отключить сервера PERCo-Web
* Перед выполнением сделайте backup БД PERCo-Web


### Загрузка и конфигурирование

Готовую к работе утилиту можно [скачать здесь](https://github.com/percodev/symmetric-simple-config/releases), выберите архив под вашу операционную систему, на которой установлен PERCo-Web.

Для ОС Windows файл называется - `symmetric_win.zip`, для ОС Linux - `symmetric_linux.zip`

Распакуйте архив, откройте папку распакованного архива и отредактируйте файл `config.ini`.

Здесь необходимо описать все сервера, текущий сервер `Master`, а остальные `Slave`. Опишите все настройки подключения правильно.

```ini
; Настройки синхронизации в миллисекундах
job.push.period.time.ms=10000 ; отправка данных
job.pull.period.time.ms=10000 ; получение данных

; Настройки мастер сервера
[master.masterServerName] ; Обязательно должно быть ключевое слово master до точки ; Каждое имя должно быть уникальным
server.port = 8080 ; на каком порту будет поднят сервер SymmetricDS. данный порт должен быть свободен и никем не занят
server.host = 'localhost' ; Укажите внешний IP адрес или доменное имя. Ваш сервер обязательно должен быть доступен остальным сегментам по сети.
; Далее идут настройки БД 
db.host = 'localhost'
db.name = 'perco'
db.password = '123456789'
db.username = 'root' 
db.port = 3306 ; Помните, что на ОС Windows порт может быть 49001

[slave.slave-001-server-name] ; Каждое имя должно быть уникальным
server.port = 8080; данный порт должен быть свободен и никем не занят
db.host = 'localhost'
db.name = 'perco_bd2'
db.password = '12345622'
db.username = 'root'
db.port = 3306 ; Помните, что на ОС Windows порт может быть 49001

[slave.slave-002-server-name] ; Каждое имя должно быть уникальным
server.port = 8080; данный порт должен быть свободен и никем не занят
db.host = 'localhost'
db.name = 'perco_bd2'
db.password = '12345622'
db.username = 'root'
db.port = 3306 ; Помните, что на ОС Windows порт может быть 49001

...
[slave.anyName] ; Каждое имя должно быть уникальным
server.port = 8080; данный порт должен быть свободен и никем не занят
db.host = 'localhost'
db.name = 'perco_bd2'
db.password = '12345622'
db.username = 'root'
db.port = 3306 ; Помните, что на ОС Windows порт может быть 49001
```

### Запуск утилиты генерации настроек SymmetricDS

После того как отредактировали файл `config.ini`, запускаем утилиту:

#### Windows
```powershell
# Желательно от имени администратора
pw_symmetric.exe
```

#### Linux
```bash
sudo ./pw_symmetric
```

После выполнения утилиты — появиться папка `tmp` переходим в неё.
В ней должны появиться папки как Вы их назвали в `config.ini`.

Мастер оставляем на текущем сервере, а папки Slave отправляем каждому сегменту свою папку.

### Первый запуск SymmetricDS

Данная операция одинакова как для Slave, так и для Master серверов.

Заходим полученную папку, далее открываем папку `symmetric-server-3.12.11` и выполняем команду:

> :warning: **ВНИМАНИЕ!**: Данную команду нужно выполнить только один раз

#### Windows
```powershell
install.bat
```
#### Linux
```bash
sudo bash ./install.sh
```

### Финал, запуск SymmetricDS
Как закончится установка и настройка БД, выполните команду для запуска SymmetricDS:
#### Windows
```powershell
start.bat
```
#### Linux
```bash
sudo bash ./start.sh
```
