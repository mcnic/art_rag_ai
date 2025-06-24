# Art RAG AI

RAG (Retrieval-Augmented Generation) система для работы с коллекцией произведений искусства Minneapolis Institute of Art.

## Описание

Система позволяет:

- Загружать и обрабатывать данные из коллекции произведений искусства
- Создавать векторные представления (эмбеддинги) с помощью локальной LLM
- Сохранять эмбеддинги в векторной базе данных Pinecone
- Выполнять семантический поиск по коллекции
- Генерировать ответы на вопросы на основе найденных документов

## Установка

### 1. Клонирование репозитория

```bash
git clone <your-repo-url>
cd art_rag_ai
```

### 2. Установка зависимостей

```bash
npm install
```

### 3. Установка Ollama

#### Linux

**Автоматическая установка:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Ручная установка (Ubuntu/Debian):**
```bash
# Добавить репозиторий
curl -fsSL https://ollama.com/install.sh | sh

# Или через apt
sudo apt update
sudo apt install ollama
```

**Arch Linux:**
```bash
yay -S ollama-bin
```

#### macOS

**Через Homebrew:**
```bash
brew install ollama
```

**Через установщик:**
1. Скачайте установщик с [https://ollama.com/download](https://ollama.com/download)
2. Откройте скачанный файл и следуйте инструкциям

#### Windows

1. Скачайте установщик с [https://ollama.com/download](https://ollama.com/download)
2. Запустите установщик и следуйте инструкциям
3. После установки перезагрузите компьютер

#### Docker

```bash
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```

### 4. Запуск Ollama

#### Первый запуск

```bash
# Запуск сервиса
ollama serve
```

**Примечание:** В первый раз Ollama может запросить разрешения на доступ к сети.

#### Автозапуск (Linux/macOS)

```bash
# Включить автозапуск
sudo systemctl enable ollama

# Запустить сервис
sudo systemctl start ollama

# Проверить статус
sudo systemctl status ollama
```

#### Проверка работы Ollama

```bash
# Проверить версию
ollama --version

# Проверить статус сервиса
curl http://localhost:11434/api/tags
```

### 5. Управление моделями

#### Список доступных моделей

```bash
# Показать все доступные модели
ollama list

# Показать модели в реестре
ollama list --remote
```

#### Загрузка модели nomic-embed-text

```bash
# Загрузка модели для эмбеддингов
ollama pull nomic-embed-text

# Проверка загрузки
ollama list
```

#### Другие полезные модели

```bash
# Модели для генерации текста
ollama pull llama3
ollama pull mistral
ollama pull phi3

# Альтернативные модели для эмбеддингов
ollama pull llama2-embed
ollama pull all-minilm
```

#### Управление моделями

```bash
# Удалить модель
ollama rm nomic-embed-text

# Перезагрузить модель
ollama pull nomic-embed-text

# Показать информацию о модели
ollama show nomic-embed-text
```

### 6. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=your_pinecone_index_name
```

## Настройка Pinecone

1. Создайте аккаунт на [https://www.pinecone.io/](https://www.pinecone.io/)
2. Создайте новый индекс:
   - **Name:** любое уникальное имя (например, `art-collection`)
   - **Dimension:** 768 (для nomic-embed-text)
   - **Metric:** cosine
   - **Pod Type:** starter (для бесплатного тарифа)
3. Скопируйте API Key и имя индекса в файл `.env`

## Тестирование

### Проверка подключения к Ollama

```bash
npm run test-ollama
```

Ожидаемый результат:
```
Ollama работает! Пример embedding: [0.123, -0.456, 0.789, -0.321, 0.654] ...
```

### Проверка подключения к Pinecone

```bash
npm run test-pinecone
```

Ожидаемый результат:
```
Индекс your_index_name доступен!
Статистика индекса: { ... }
```

## Использование

### 1. Загрузка и обработка данных

```bash
# Скачивание коллекции и обработка документов
npm run save-chunks
```

Эта команда:
- Скачивает репозиторий с коллекцией произведений искусства
- Обрабатывает JSON файлы и извлекает текстовые данные
- Разбивает документы на чанки размером 750 символов с перекрытием 75 символов
- Сохраняет чанки в файл `chunks.json`

### 2. Создание эмбеддингов и загрузка в Pinecone

```bash
npm run embed
```

Эта команда:
- Загружает чанки из файла `chunks.json`
- Получает эмбеддинги через Ollama API (модель nomic-embed-text)
- Загружает эмбеддинги в Pinecone батчами по 100 штук

### 3. Поиск по коллекции

```bash
npm run search -- "ваш поисковый запрос"
```

Примеры запросов:
```bash
npm run search -- "картины Рембрандта"
npm run search -- "скульптуры Древней Греции"
npm run search -- "импрессионизм"
```

## Структура проекта

```
art_rag_ai/
├── scripts/
│   ├── load_and_process.js      # Обработка документов
│   ├── embed_and_store.js       # Создание эмбеддингов и работа с Pinecone
│   ├── test_ollama.js          # Тест Ollama
│   ├── test_pinecone.js        # Тест Pinecone
│   └── test_openai.js          # Тест OpenAI (если понадобится)
├── collection/                  # Данные коллекции (скачиваются автоматически)
├── chunks.json                 # Обработанные чанки документов
├── package.json
└── README.md
```

## Команды npm

| Команда | Описание |
|---------|----------|
| `npm run download-collection` | Скачивание коллекции |
| `npm run process` | Обработка документов (вывод в консоль) |
| `npm run save-chunks` | Обработка и сохранение чанков в файл |
| `npm run embed` | Создание эмбеддингов и загрузка в Pinecone |
| `npm run search` | Поиск по коллекции |
| `npm run test-ollama` | Тест подключения к Ollama |
| `npm run test-pinecone` | Тест подключения к Pinecone |
| `npm run test-openai` | Тест подключения к OpenAI |

## Требования

- Node.js 16+
- Ollama с моделью nomic-embed-text
- Аккаунт Pinecone
- Минимум 4 ГБ RAM (для работы с nomic-embed-text)
- 5+ ГБ свободного места на диске

## Устранение неполадок

### Проблемы с Ollama

#### Ollama не запускается
```bash
# Проверить статус сервиса
sudo systemctl status ollama

# Перезапустить сервис
sudo systemctl restart ollama

# Проверить логи
sudo journalctl -u ollama -f
```

#### Ошибка "permission denied"
```bash
# Добавить пользователя в группу ollama
sudo usermod -a -G ollama $USER

# Перезагрузить систему или перелогиниться
sudo reboot
```

#### Ошибка "port already in use"
```bash
# Найти процесс, использующий порт 11434
sudo lsof -i :11434

# Остановить процесс
sudo kill -9 <PID>
```

#### Модель не загружается
```bash
# Проверить свободное место
df -h

# Очистить кэш
ollama rm nomic-embed-text
ollama pull nomic-embed-text
```

#### Ошибка "Cannot find module '@pinecone-database/pinecone'"
```bash
npm install @pinecone-database/pinecone
```

#### Ошибка "Cannot find module 'node-fetch'"
```bash
npm install node-fetch
```

#### Ошибка подключения к Ollama
1. Убедитесь, что Ollama сервис запущен: `ollama serve`
2. Проверьте, что модель загружена: `ollama list`
3. При необходимости перезагрузите модель: `ollama pull nomic-embed-text`
4. Проверьте доступность API: `curl http://localhost:11434/api/tags`

#### Ошибка подключения к Pinecone
1. Проверьте правильность API Key в файле `.env`
2. Убедитесь, что индекс существует и доступен
3. Проверьте, что размерность индекса соответствует модели (768 для nomic-embed-text)

### Полезные команды Ollama

```bash
# Информация о системе
ollama info

# Логи Ollama
ollama logs

# Очистка неиспользуемых моделей
ollama prune

# Экспорт модели
ollama export nomic-embed-text > model.tar

# Импорт модели
ollama import model.tar
```

## Лицензия

MIT 
MIT 