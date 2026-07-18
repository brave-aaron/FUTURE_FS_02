const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const SORT_MAP = {
  createdAt_desc: 'created_at DESC',
  createdAt_asc: 'created_at ASC',
  fullName_asc: 'full_name ASC',
  fullName_desc: 'full_name DESC',
  value_desc: 'value DESC',
  value_asc: 'value ASC'
};

// GET /api/leads?search=&status=&source=&sort=&page=&limit=
router.get('/', async (req, res) => {
  const { search, status, source, sort = 'createdAt_desc' } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 100000);
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const params = [];

  if (status && status !== 'all') {
    where += ' AND status = ?';
    params.push(status);
  }
  if (source && source !== 'all') {
    where += ' AND source = ?';
    params.push(source);
  }
  if (search) {
    where += ' AND (full_name LIKE ? OR email LIKE ? OR company LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const orderBy = SORT_MAP[sort] || SORT_MAP.createdAt_desc;

  try {
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM leads ${where}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT * FROM leads ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      leads: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération des leads.' });
  }
});

// GET /api/leads/:id  (détail + notes)
router.get('/:id', async (req, res) => {
  try {
    const [leadRows] = await pool.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (leadRows.length === 0) {
      return res.status(404).json({ error: 'Lead introuvable.' });
    }

    const [notes] = await pool.query(
      'SELECT * FROM lead_notes WHERE lead_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    res.json({ ...leadRows[0], notes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération du lead.' });
  }
});

// POST /api/leads
router.post('/', async (req, res) => {
  const { fullName, email, phone, company, source, status, value } = req.body;

  if (!fullName || !fullName.trim() || !email || !email.trim()) {
    return res.status(400).json({ error: 'Le nom et l\'email sont obligatoires.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO leads (full_name, email, phone, company, source, status, value)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        fullName.trim(),
        email.trim(),
        phone ? phone.trim() : null,
        company ? company.trim() : null,
        source || 'website',
        status || 'new',
        Number.isFinite(Number(value)) ? Number(value) : 0
      ]
    );
    res.status(201).json({ id: result.insertId, message: 'Lead créé avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la création du lead.' });
  }
});

// PUT /api/leads/:id
router.put('/:id', async (req, res) => {
  const { fullName, email, phone, company, source, status, value } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE leads SET
        full_name = COALESCE(?, full_name),
        email = COALESCE(?, email),
        phone = ?,
        company = ?,
        source = COALESCE(?, source),
        status = COALESCE(?, status),
        value = COALESCE(?, value)
       WHERE id = ?`,
      [
        fullName ? fullName.trim() : null,
        email ? email.trim() : null,
        phone !== undefined ? phone.trim() : null,
        company !== undefined ? company.trim() : null,
        source,
        status,
        value !== undefined ? Number(value) : null,
        req.params.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Lead introuvable.' });
    }

    res.json({ message: 'Lead mis à jour avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du lead.' });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM leads WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Lead introuvable.' });
    }
    res.json({ message: 'Lead supprimé avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la suppression du lead.' });
  }
});

// ---------- Notes ----------

// POST /api/leads/:id/notes
router.post('/:id/notes', async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'La note ne peut pas être vide.' });
  }

  try {
    const [leadRows] = await pool.query('SELECT id FROM leads WHERE id = ?', [req.params.id]);
    if (leadRows.length === 0) {
      return res.status(404).json({ error: 'Lead introuvable.' });
    }

    const [result] = await pool.query(
      'INSERT INTO lead_notes (lead_id, content) VALUES (?, ?)',
      [req.params.id, content.trim()]
    );
    res.status(201).json({ id: result.insertId, message: 'Note ajoutée avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la note.' });
  }
});

// PUT /api/leads/:leadId/notes/:noteId
router.put('/:leadId/notes/:noteId', async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'La note ne peut pas être vide.' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE lead_notes SET content = ? WHERE id = ? AND lead_id = ?',
      [content.trim(), req.params.noteId, req.params.leadId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Note introuvable.' });
    }
    res.json({ message: 'Note mise à jour avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la note.' });
  }
});

// DELETE /api/leads/:leadId/notes/:noteId
router.delete('/:leadId/notes/:noteId', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM lead_notes WHERE id = ? AND lead_id = ?',
      [req.params.noteId, req.params.leadId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Note introuvable.' });
    }
    res.json({ message: 'Note supprimée avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la suppression de la note.' });
  }
});

module.exports = router;
