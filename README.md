# Song Lyrics Management System

A web application for managing and analyzing song lyrics, built with NestJS and PostgreSQL.

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. Clone the repository:
bash
git clone <repository-url>
cd <project-directory>

2. Install dependencies:
```bash
npm install
```

3. Create a PostgreSQL database and update the database configuration in `src/app.module.ts` or use environment variables.

4. Run database migrations:
```bash
npm run typeorm:run-migrations
```

## Running the Application

1. Start the development server:
```bash
npm run start:dev
```

2. The API will be available at `http://localhost:3000`

## API Endpoints

### Songs

- `GET /songs` - Get all songs with optional filters
  - Query parameters:
    - `name`: Filter by song name
    - `authors`: Filter by authors
    - `composers`: Filter by composers
    - `singers`: Filter by singers

- `POST /songs` - Add a new song
  - Body: 
    ```json
    {
      "name": "Song Name",
      "filename": "song-file.txt",
      "authors": "Author1, Author2",
      "composers": "Composer1, Composer2",
      "singers": "Singer1, Singer2",
      "text": "Song lyrics..."
    }
    ```

### Word Analysis

- `GET /word-context/:word/:songId` - Get context for a specific word in a song
  - Parameters:
    - `word`: The word to search for
    - `songId`: ID of the song
    - `contextSize` (optional): Number of words for context (default: 20)

### Backup and Restore

The system includes functionality to backup and restore the database in XML format.

#### Creating a Backup

1. Use the backup-db script:
```bash
npm run backup-db
```

2. The backup file will be created.

#### Restoring from Backup

1. Use the restore-db script:
```bash
npm run restore-db
```

```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details