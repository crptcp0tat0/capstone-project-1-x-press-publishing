const bodyParser = require('body-parser')
const cors = require('cors')
const errorHandler = require('errorHandler')
const express = require('express')
const sqlite3 = require('sqlite3')
db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite')

const app = express()

app.use(bodyParser.json())
app.use(cors())
app.use(errorHandler())

const PORT = process.env.PORT || 4000

const apiRouter = express.Router()
app.use('/api', apiRouter)

const artistsRouter = express.Router()
apiRouter.use('/artists', artistsRouter)

const seriesRouter = express.Router()
apiRouter.use('/series', seriesRouter)

const artistValidation = (req, res, next) => {
  if (!req.body.artist.name || !req.body.artist.dateOfBirth || !req.body.artist.biography) {
    return res.sendStatus(400);
  } else {
    next();
  }
}

const artistCheck = (req, res, next) => {
  db.get(`SELECT * FROM Artist WHERE id = ${req.params.id}`, (err, row) => {
    if (!row) {
      return res.sendStatus(404);
    } else {
      next();
    }
  })
}

const seriesValidation = (req, res, next) => {
  const series = req.body.series
  if (!series.name || !series.description) {
    return res.sendStatus(400)
  } else {
    next();
  }
}

const seriesCheck = (req, res, next) => {
  db.get(`SELECT * FROM Series WHERE id = ${req.params.id || req.params.seriesId}`, (err, row) => {
    if (!row) {
      return res.sendStatus(404);
    } else {
      next();
    }
  })
}

const seriesInIssue = (req, res, next) => {
  db.get(`SELECT * FROM Issue WHERE Issue.series_id = ${req.params.id}`, (err, row) => {
    if (!row) {
      next();
    } else {
      return res.sendStatus(400);
    }
  })
}

const seriesIssue = (req, res, next) => {
  db.get(`SELECT * FROM Issue WHERE Issue.series_id = ${req.params.id}`, (err, row) => {
    if (row) {
      next();
    } else {
      res.status(404).json({issues: []});
    }
  })
}

const artistIssue = (req, res, next) => {
  db.get(`SELECT * FROM Issue WHERE Issue.artist_id = ${req.body.issue.artistId}`, (err, row) => {
    if (row) {
      next()
    } else {
      return res.sendStatus(400);
    }
  })
}

const issueValidation = (req, res, next) => {
  const issue = req.body.issue
  if (!issue.name || !issue.issueNumber || !issue.publicationDate || !issue.artistId) {
    return res.sendStatus(400)
  } else {
    next();
  }
}

const issueInIssue = (req, res, next) => {
  db.get(`SELECT * FROM Issue WHERE id = ${req.params.issueId}`, (err, row) => {
    if (!row) {
      return res.sendStatus(404);
    } else {
      next();
    }
  })
}

const issueCheck = (req, res, next) => {
  const issueNumber = req.body.issue.issueNumber
  db.get(`SELECT * FROM Issue WHERE issue_number = ${issueNumber}`, (err, row) => {
    if (!row) {
      return res.sendStatus(404);
    } else {
      next();
    }
  })
}


artistsRouter.get('/', (req, res, next) => {
  db.all('SELECT * FROM Artist WHERE is_currently_employed = 1', (err, rows) => {
    res.status(200).json({artists: rows});
  })
})

artistsRouter.get('/:id', artistCheck, (req, res, next) => {
  db.get('SELECT * FROM Artist WHERE Artist.id = $id', {$id: req.params.id}, (err, row) => {
    res.status(200).json({artist: row})
  })
})

artistsRouter.post('/', artistValidation, (req, res, next) => {
  db.run(`INSERT INTO Artist (name, date_of_birth, biography) VALUES ('${req.body.artist.name}', '${req.body.artist.dateOfBirth}', '${req.body.artist.biography}')`, function(err) {
    db.get(`SELECT * FROM Artist WHERE Artist.id = ${this.lastID}`, (err, row) => {
      res.status(201).json({artist: row})
    })
  })
})

artistsRouter.put('/:id', artistValidation, artistCheck, (req, res, next) => {
  db.serialize(() => {
    db.run(`UPDATE Artist SET name = '${req.body.artist.name}', date_of_birth = '${req.body.artist.dateOfBirth}', biography = '${req.body.artist.biography}', is_currently_employed = ${req.body.artist.isCurrentlyEmployed} WHERE id = ${req.params.id}`)
    db.get(`SELECT * FROM Artist WHERE id = ${req.params.id}`, (err, row) => {res.status(200).json({artist: row})})
  })
})

artistsRouter.delete('/:id', artistCheck, (req, res, next) => {
  db.serialize(() => {
    db.run(`UPDATE Artist SET is_currently_employed = 0 WHERE id = ${req.params.id}`)
    db.get(`SELECT * FROM Artist WHERE id = ${req.params.id}`, (err, row) => {res.status(200).json({artist: row})})
  })
})

seriesRouter.get('/', (req, res, next) => {
  db.all('SELECT * FROM Series', (err, rows) => {
    res.status(200).json({series: rows})
  })
})

seriesRouter.get('/:id', seriesCheck, (req, res, next) => {
  db.get(`SELECT * FROM Series WHERE Series.id = ${req.params.id}`, (err, row) => {
    res.status(200).json({series: row})
  })
})

seriesRouter.post('/', seriesValidation, (req, res, next) => {
  const series = req.body.series;
  db.run(`INSERT INTO Series (name, description) VALUES ('${series.name}', '${series.description}')`, function(error) {
    db.get(`SELECT * FROM Series WHERE id = ${this.lastID}`, (err, row) => {
      res.status(201).json({series: row})
    })
  })
})

seriesRouter.put('/:id', seriesValidation, seriesCheck, (req, res, next) => {
  const series = req.body.series;
  db.serialize(() => {
    db.run(`UPDATE Series SET name = '${series.name}', description = '${series.description}' WHERE id = ${req.params.id}`)
    db.get(`SELECT * FROM Series WHERE id = ${req.params.id}`, (err, row) => {
      res.status(200).json({series: row})
    })
  })
})

seriesRouter.delete('/:id', seriesInIssue, (req, res, next) => {
  db.run(`DELETE FROM Series WHERE id = ${req.params.id}`, (err) => {
    return res.sendStatus(204);
  })
})

seriesRouter.get('/:id/issues', seriesIssue, (req, res, next) => {
  db.all(`SELECT * FROM Issue WHERE Issue.series_id = ${req.params.id}`, (err, rows) => {
    res.status(200).json({issues: rows})
  })
})

seriesRouter.post('/:seriesId/issues', artistIssue, issueValidation, (req, res, next) => {
  const issue = req.body.issue;
  db.serialize(() => {
    db.run(`INSERT INTO Issue (name, issue_number, publication_date, artist_id, series_id) VALUES ('${issue.name}', ${issue.issueNumber}, '${issue.publicationDate}', ${issue.artistId}, ${req.params.seriesId})`);
    db.get(`SELECT * FROM Issue WHERE Issue.issue_number = ${issue.issueNumber}`, (err, row) => {
      res.status(201).json({issue: row})
    })
  })
})

seriesRouter.put('/:seriesId/issues/:issueId', issueInIssue, issueValidation, (req, res, next) => {
  const issue = req.body.issue;
  db.serialize(() => {
    db.run(`UPDATE Issue SET name = '${issue.name}', issue_number = '${issue.issueNumber}', publication_date = '${issue.publicationDate}', artist_id = ${issue.artistId} WHERE id = ${req.params.issueId}`)
    db.get(`SELECT * FROM Issue WHERE id = ${req.params.issueId}`, (err, row) => {
      res.status(200).json({issue: row})
    })
  })
})

seriesRouter.delete('/:seriesId/issues/:issueId', issueInIssue, seriesCheck, (req, res, next) => {
  db.run(`DELETE FROM Issue WHERE id = ${req.params.issueId}`, (err) => {
    return res.sendStatus(204);
  })
})
app.listen(PORT, () => {
  console.log(`Console is listening on ${PORT}`);
})

module.exports = app;
