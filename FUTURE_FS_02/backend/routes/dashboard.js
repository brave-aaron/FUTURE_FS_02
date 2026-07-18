const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const [leads] = await pool.query('SELECT * FROM leads');

    const totalLeads = leads.length;
    const qualifiedLeads = leads.filter((l) => l.status === 'qualified').length;
    const convertedLeads = leads.filter((l) => l.status === 'converted').length;
    const lostLeads = leads.filter((l) => l.status === 'lost').length;
    const negotiationLeads = leads.filter((l) => l.status === 'negotiation').length;

    const conversionRate = totalLeads > 0
      ? parseFloat(((convertedLeads / totalLeads) * 100).toFixed(1))
      : 0;

    const pipelineValue = leads
      .filter((l) => ['new', 'qualified', 'contacted', 'negotiation'].includes(l.status))
      .reduce((sum, l) => sum + (l.value || 0), 0);

    const latestLeads = [...leads]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    // Activité récente : notes + créations/mises à jour de leads, fusionnées et triées
    const [rawNotes] = await pool.query(
      `SELECT n.*, l.full_name AS lead_name
       FROM lead_notes n
       JOIN leads l ON l.id = n.lead_id
       ORDER BY n.created_at DESC LIMIT 5`
    );

    const activities = [];

    rawNotes.forEach((n) => {
      activities.push({
        id: `note-${n.id}`,
        type: 'NOTE',
        message: `Nouvelle note ajoutée pour ${n.lead_name}`,
        meta: n.content.length > 40 ? `${n.content.substring(0, 40)}...` : n.content,
        timestamp: n.created_at
      });
    });

    leads.forEach((l) => {
      activities.push({
        id: `lead-new-${l.id}`,
        type: 'LEAD_CREATED',
        message: `Le lead ${l.full_name} a été créé`,
        meta: `${l.company || 'Sans société'} · ${l.source}`,
        timestamp: l.created_at
      });
      if (new Date(l.updated_at).getTime() !== new Date(l.created_at).getTime()) {
        activities.push({
          id: `lead-update-${l.id}`,
          type: 'LEAD_UPDATED',
          message: `Le lead ${l.full_name} a été mis à jour`,
          meta: `Statut : ${l.status}`,
          timestamp: l.updated_at
        });
      }
    });

    const recentActivity = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 6);

    res.json({
      metrics: {
        totalLeads,
        qualifiedLeads,
        convertedLeads,
        lostLeads,
        negotiationLeads,
        conversionRate,
        pipelineValue
      },
      latestLeads,
      recentActivity
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors du calcul des statistiques.' });
  }
});

module.exports = router;
