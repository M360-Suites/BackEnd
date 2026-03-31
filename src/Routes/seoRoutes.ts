import { Router } from "express";
import { analyzeSite, getAllStats, getSiteClarityData } from "../Controllers/SEO/Controllers/getAllStats";
import { authMiddleware } from "../Middlewares/authmiddleware";
import { saveSEOCred } from "../Controllers/SEO/Controllers/saveSeoCred";
import { CustomRequestHandler } from "../Types/CustomRequest";
import { requireRole } from "../Middlewares/roleMiddleware";
import { BacklinkController, DomainController, KeywordController, SiteAuditController, TrafficController } from "../Controllers/SEO/Controllers";

const router = Router();
router.use(authMiddleware as CustomRequestHandler);

// Controllers
const auditController = new SiteAuditController();
const backlinkController = new BacklinkController();
const trafficController = new TrafficController();
const domianController = new DomainController();
const keywordController = new KeywordController();


// Routes

// Audit routes
router.post('/seo/audits', auditController.requestAudit.bind(auditController) as CustomRequestHandler);
router.get('/seo/audits', auditController.getAuditHistory.bind(auditController) as CustomRequestHandler);
router.get('/seo/audits/:auditId', auditController.getAuditStatus.bind(auditController) as CustomRequestHandler);
router.get('/seo/audits/:auditId/report', auditController.generateReport.bind(auditController) as CustomRequestHandler);


// Backlink routes
router.post('/seo/backlinks/scan', backlinkController.scanBacklinks.bind(backlinkController) as CustomRequestHandler);
router.get('/seo/backlinks/scan/:jobId/status', backlinkController.getJobStatus.bind(backlinkController) as CustomRequestHandler);

router.get('/seo/domains/:domainId/backlinks/analysis', backlinkController.getAnalysis.bind(backlinkController) as CustomRequestHandler);
router.get('/seo/domains/:domainId/backlinks/monitoring', backlinkController.getMonitoring.bind(backlinkController) as CustomRequestHandler);
router.get('/seo/domains/:domainId/backlinks/competitors', backlinkController.findCompetitors.bind(backlinkController) as CustomRequestHandler);
router.get('/seo/domains/:domainId/backlinks/timeline', backlinkController.getTimeline.bind(backlinkController) as CustomRequestHandler);

// Traffic routes
router.post('/seo/traffic/sync', trafficController.syncTraffic.bind(trafficController) as CustomRequestHandler);
router.get('/seo/traffic/sync/:jobId/status', trafficController.getJobStatus.bind(trafficController) as CustomRequestHandler);

router.get('/seo/domains/:domainId/traffic/overview', trafficController.getOverview.bind(trafficController) as CustomRequestHandler);
router.get('/seo/domains/:domainId/traffic/realtime', trafficController.getRealtime.bind(trafficController) as CustomRequestHandler);
router.get('/seo/domains/:domainId/traffic/sources', trafficController.getSources.bind(trafficController) as CustomRequestHandler);
router.get('/seo/domains/:domainId/traffic/acquisition', trafficController.getAcquisition.bind(trafficController) as CustomRequestHandler);
router.get('/seo/domains/:domainId/traffic/timeline', trafficController.getTimeline.bind(trafficController) as CustomRequestHandler);

// Domain routes
router.post('/seo/domains', domianController.addDomain.bind(domianController) as CustomRequestHandler);
router.get('/seo/domains', domianController.listDomains.bind(domianController) as CustomRequestHandler);
router.get('/seo/domains/:domainId', domianController.getDomain.bind(domianController) as CustomRequestHandler);
router.put('/seo/domains/:domainId', domianController.updateDomain.bind(domianController) as CustomRequestHandler);
router.delete('/seo/domains/:domainId', domianController.deleteDomain.bind(domianController) as CustomRequestHandler);

// Domain verification
router.post('/seo/domains/:domainId/verify', domianController.verifyDomain.bind(domianController) as CustomRequestHandler);
router.get('/seo/domains/:domainId/verification', domianController.getVerificationInstructions.bind(domianController) as CustomRequestHandler);


// Keyword routes
router.post('/seo/keywords', keywordController.addKeywords.bind(keywordController) as CustomRequestHandler);
router.get('/seo/keywords/ranking', keywordController.getRankings.bind(keywordController) as CustomRequestHandler);
router.get('/seo/keywords/overview', keywordController.getOverview.bind(keywordController) as CustomRequestHandler);
router.get('/seo/keywords/suggestions', keywordController.getSuggestions.bind(keywordController) as CustomRequestHandler);


// router.get("/seo", getAllStats as CustomRequestHandler);
// router.get("/seo/pagespeed", analyzeSite as CustomRequestHandler);
// router.get("/seo/clarity", getSiteClarityData as CustomRequestHandler);
// router.post("/seo/cred", requireRole('owner', 'admin') as CustomRequestHandler, saveSEOCred as CustomRequestHandler);

export default router;