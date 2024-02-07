# Бэкенд к итоговой работе «C-Money»


## Установка и запуск проекта
1. Для запуска данного проекта вам понадобится nodejs и npm.  
2. Склонируйте данный репозиторий к себе на диск. Затем выполните `npm i` для установки и `npm start` для запуска сервера.  
3. По умолчанию сервер слушает на 3000-ом порту localhost.  

Помните, что в репозиторий могли добавляться правки и улучшения, поэтому не забывайте периодически стягивать обновления посредством `git pull`.  


## Логин и пароль
На данный момент доступен только вход в следующий аккаунт:  
* Логин: `developer`  
* Пароль: `methed`  

Подробнее о том, как авторизоваться смотрите ниже в документации API.  


## Существующие счета
Сразу после запуска сервера существуют следующие счета:  

1. Ваш пользовательский счёт с длинной историей переводов (на него будут регулярно поступать входящие переводы с произвольных счетов):  
	* 24051911200915061003240821

2. Набор других счетов, которые не принадлежат пользователю, но гарантированно существуют. С их помощью вы можете проверять функционал перечисления средств со счёта на счёт:  
	* 20530478211782688256124528
	* 25103808305087276118446870
	* 87360872061730026356786724
	* 12508408027460025280024028
	* 7022200000250040
	* 2411553415544415


## Формат ответа API
Все методы API отвечают объектом следующего общего формата:  
```js
{
	payload, // любое произвольное значение, которое вернёт метод API (null, если произошла ошибка или невозможно вернуть какие-либо значимые данные)
	error // текст описания/кода ошибки, которая произошла; заполняется, только если произошла ошибка. При успешном завершении работы метода здесь всегда будет пустая строка.
}
```


## Методы API

### POST /login
Авторизация пользователя.  
На данный момент метод позволяет вход для следующего пользователя:  
```js
{
	login: 'developer',
	password: 'methed'
}
```

В ответ вернёт payload следующего формата:  
```js
{ token }
```
где token — это строка, содержащая информацию для доступа к запросам, требующим авторизацию.  

**Возможные ошибки:**  
* `Invalid password` — пытаемся войти с неверным паролем;
* `No such user` — пользователя с таким логином не существует.

В дальнейшем токен указывается в заголовке Authorization для методов, которые требуют авторизации: `Authorization: Basic TOKEN`, где TOKEN заменяем на значение токена, которое мы получили.  

Если мы запрашиваем какой-либо метод и он возвращает ошибку `Unauthorized`, это означает, что мы забыли предоставить заголовок с токеном при вызове метода.  


### GET /accounts
Возвращает список счетов пользователя.  
Ответом будет массив с информацией об счёте пользователя примерно в таком формате:  
```js
[
	{
		"account": "21304142477773744060783754",
		"balance": 0,
		"transactions": [
			{
				"amount": 1234,
				"date": "2021-08-24T15:00:41.576Z",
				"from": "25374745822886120828265011",
				"to": "21304142477773744060783754"
			}
		]
	}
]
```
**Примечание:** данный метод возвращает только последнюю транзакцию из истории транзакций.


### GET /account/{id}
Метод возвращает подробную информацию о счёте пользователя, где {id} в адресе метода — это номер счёта.  

Формат ответа примерно такой:
```js
[
	{
		"account": "21304142477773744060783754",
		"balance": 0,
		"transactions": [
			{
				"amount": 1234,
				"date": "2021-08-24T20:00:24.286Z",
				"from": "25374745822886120828265011",
				"to": "21304142477773744060783754"
			}
		]
	}
]
```
**Примечание:** данный метод возвращает полную историю транзакций по счёту.  


### POST /create-account
Метод создаёт для пользователя новый счёт, тело запроса не важно.  

Отвечает объектом с информацией о новом созданном счёте:  
```js
	"22043182826882537474528011": {
		"account": "21304142477773744060783754",
		"balance": 0,
		"mine": false,
		"transactions": []
	},
```

### POST /transfer-funds
Метод перевода средств со счёта на счёт.  

Тело запроса:
```js
{
	from, // счёт с которого списываются средства
	to, // счёт, на который зачисляются средства
	amount // сумма для перевода
}
```

Метод отвечает объектом счёта, с которого был произведён перевод.  

**Возможнные ошибки:**  
* `Invalid account from` — не указан адрес счёта списания, или этот счёт не принадлежит нам;
* `Invalid account to`  — не указан счёт зачисления, или этого счёта не существует;
* `Invalid amount` — не указана сумма перевода, или она отрицательная;
* `Overdraft prevented` — мы попытались перевести больше денег, чем доступно на счёте списания.


### GET /all-currencies
Метод отвечает массивом со списком кодов всех используемых бекэндом валют на данный момент, например:
```js
[
	'ETH',
	'BTC',
	'USD',
	'EUR',
	'JPY',
	'GBP',
	'AUD',
	'CAD',
	'CHF',
	'CNH',
	'HKD',
	'NZD',
	'RUB',
	'UAH',
	'BYR'
]
```


### GET /currencies
Метод возвращает список валютных счетов текущего пользователя.  
Отвечает объектом с информацией о балансах валютных счетов данного пользователя:  
```js
{
	"AUD": {
		"amount": 12.36,
		"code": "AUD"
	},
	"BTC": {
		"amount": 2031.15,
		"code": "BTC"
	},
	"BYR": {
		"amount": 55.67,
		"code": "BYR"
	},
}
```


### POST /currency-buy
Метод совершения валютного обмена.  

Тело запроса:  
```js
{
	from, // код валютного счёта, с которого списываются средства
	to, // код валютного счёта, на который зачисляются средства
	amount // сумма, которая списывается, конвертация вычисляется сервером автоматически, исходя из текущего валютного курса для данной валютной пары
}
```

Метод отвечает объектом с информацией о балансах валютных счетов данного пользователя (см. `/currencies`).  

**Возможнные ошибки:**  
* `Unknown currency code` — передан неверный валютный код, код не поддерживается системой (валютный код списания или валютный код зачисления);  
`Invalid amount` — не указана сумма перевода, или она отрицательная;  
`Not enough currency` — на валютном счёте списания нет средств;
`Overdraft prevented` — попытка перевести больше, чем доступно на счёте списания.


### Websocket /currency-feed
Это websocket-стрим, который будет выдавать сообщения об изменении курса обмена валют.  
  
Формат сообщения:  
```js
{
	"type":"EXCHANGE_RATE_CHANGE",
	"from":"NZD",
	"to":"CHF",
	"rate":33.12,
	"change":1
}
```
где:  
* `type` — тип сообщения, которое можно использовать, чтобы отфильтровать данное сообщение от любых других типов сообщений, если таковые будут приходить;
* `from` — код валюты, из которой производится конвертирование;
* `to` — код валюты, в которую производится конвертирование;
* `rate` — курс обмена вышеприведённых валют;
* `change` — изменение курса по отношению к предыдущему значению: `1` — возрастание курса, `-1` — убывание курса, `0` — курс не изменился.  

 
