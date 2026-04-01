"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authmiddleware_1 = require("../Middlewares/authmiddleware");
const Controllers_1 = require("../Controllers/SEO/Controllers");
const router = (0, express_1.Router)();
router.use(authmiddleware_1.authMiddleware);
// Controllers
const auditController = new Controllers_1.SiteAuditController();
const backlinkController = new Controllers_1.BacklinkController();
const trafficController = new Controllers_1.TrafficController();
const domianController = new Controllers_1.DomainController();
const keywordController = new Controllers_1.KeywordController();
// Routes
// Audit routes
router.post('/seo/audits', auditController.requestAudit.bind(auditController));
router.get('/seo/audits', auditController.getAuditHistory.bind(auditController));
router.get('/seo/audits/:auditId', auditController.getAuditStatus.bind(auditController));
router.get('/seo/audits/:auditId/report', auditController.generateReport.bind(auditController));
// Backlink routes
router.post('/seo/backlinks/scan', backlinkController.scanBacklinks.bind(backlinkController));
router.get('/seo/backlinks/scan/:jobId/status', backlinkController.getJobStatus.bind(backlinkController));
router.get('/seo/domains/:domainId/backlinks/analysis', backlinkController.getAnalysis.bind(backlinkController));
router.get('/seo/domains/:domainId/backlinks/monitoring', backlinkController.getMonitoring.bind(backlinkController));
router.get('/seo/domains/:domainId/backlinks/competitors', backlinkController.findCompetitors.bind(backlinkController));
router.get('/seo/domains/:domainId/backlinks/timeline', backlinkController.getTimeline.bind(backlinkController));
// Traffic routes
router.post('/seo/traffic/sync', trafficController.syncTraffic.bind(trafficController));
router.get('/seo/traffic/sync/:jobId/status', trafficController.getJobStatus.bind(trafficController));
router.get('/seo/domains/:domainId/traffic/overview', trafficController.getOverview.bind(trafficController));
router.get('/seo/domains/:domainId/traffic/realtime', trafficController.getRealtime.bind(trafficController));
router.get('/seo/domains/:domainId/traffic/sources', trafficController.getSources.bind(trafficController));
router.get('/seo/domains/:domainId/traffic/acquisition', trafficController.getAcquisition.bind(trafficController));
router.get('/seo/domains/:domainId/traffic/timeline', trafficController.getTimeline.bind(trafficController));
// Domain routes
router.post('/seo/domains', domianController.addDomain.bind(domianController));
router.get('/seo/domains', domianController.listDomains.bind(domianController));
router.get('/seo/domains/:domainId', domianController.getDomain.bind(domianController));
router.put('/seo/domains/:domainId', domianController.updateDomain.bind(domianController));
router.delete('/seo/domains/:domainId', domianController.deleteDomain.bind(domianController));
// Domain verification
router.post('/seo/domains/:domainId/verify', domianController.verifyDomain.bind(domianController));
router.get('/seo/domains/:domainId/verification', domianController.getVerificationInstructions.bind(domianController));
// Keyword routes
router.post('/seo/keywords', keywordController.addKeywords.bind(keywordController));
router.get('/seo/keywords/ranking', keywordController.getRankings.bind(keywordController));
router.get('/seo/keywords/overview', keywordController.getOverview.bind(keywordController));
router.get('/seo/keywords/suggestions', keywordController.getSuggestions.bind(keywordController));
// router.get("/seo", getAllStats as CustomRequestHandler);
// router.get("/seo/pagespeed", analyzeSite as CustomRequestHandler);
// router.get("/seo/clarity", getSiteClarityData as CustomRequestHandler);
// router.post("/seo/cred", requireRole('owner', 'admin') as CustomRequestHandler, saveSEOCred as CustomRequestHandler);
exports.default = router;
