const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const db = new sqlite3.Database('./lifts.db');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));  // Serve static files from public folder

// Initialize database
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS lifts (exercise TEXT, weight REAL, date TEXT)");
});

app.post('/save', (req, res) => {
    const { exercise, weight, sets } = req.body;

    let setsAbove7 = sets.filter(rep => rep >= 7).length;

    let newWeight = weight;

    if (setsAbove7 === 4) {
        newWeight += 2.5;
    }

    const stmt = db.prepare("INSERT INTO lifts (exercise, weight, date) VALUES (?, ?, ?)");
    stmt.run(exercise, newWeight, new Date().toISOString());
    stmt.finalize();

    res.send({ success: true });
});


app.get('/latest', (req, res) => {
    db.all("SELECT exercise, weight FROM lifts ORDER BY date DESC LIMIT 5", [], (err, rows) => {
        if (err) throw err;
        res.send(rows);
    });
});

app.get('/latest-weight/:exercise', (req, res) => {
    const exercise = req.params.exercise;
    db.get("SELECT weight FROM lifts WHERE exercise = ? ORDER BY date DESC LIMIT 1", [exercise], (err, row) => {
        if (err) throw err;
        res.send(row);
    });
});

app.get('/latest-weights', (req, res) => {
    // Query to fetch the latest weight for each exercise
    const query = `
        SELECT exercise, weight 
        FROM (
            SELECT exercise, weight, date, 
                   ROW_NUMBER() OVER(PARTITION BY exercise ORDER BY date DESC) as rn 
            FROM lifts
        ) 
        WHERE rn = 1
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).send({ error: 'Database error' });
            return;
        }
        res.send(rows);
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
