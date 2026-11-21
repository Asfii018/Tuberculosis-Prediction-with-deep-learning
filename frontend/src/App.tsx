import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileImage,
  FileText,
  HeartPulse,
  History,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  Plus,
  ScanLine,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Upload,
} from "lucide-react";

const AnalysisChart = lazy(() => import("./AnalysisChart"));

type PredictionResponse = {
  predicted_class: "NORMAL" | "TUBERCULOSIS";
  tb_score: number;
  score_is_calibrated: boolean;
  segmentation_mask_png_base64?: string | null;
  lung_roi_png_base64?: string | null;
  grad_cam_png_base64?: string | null;
  processing_time_ms?: number;
  prediction_timestamp?: string;
};

type Analysis = {
  id: string;
  fileName: string;
  analyzedAt: string;
  predictedClass: PredictionResponse["predicted_class"];
  tbScore: number;
  scoreIsCalibrated: boolean;
  processingTimeMs?: number;
  originalImage: string;
  reportImage?: string;
  maskImage?: string;
  roiImage?: string;
  gradCamImage?: string;
};

type AnalysisStats = {
  total: number;
  normal: number;
  tuberculosis: number;
};

type HealthResponse = {
  api_ready: boolean;
  model_ready: boolean;
  model: {
    state: string;
    error: string | null;
    missing_artifacts: string[];
    segmentation_backend?: string;
    pipeline?: string;
  };
};

type Page = "landing" | "dashboard" | "upload" | "history" | "results";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const api = axios.create({ baseURL: API_BASE_URL });
const HISTORY_STORAGE_KEY = "thorax-ai-analysis-history";
const STATS_STORAGE_KEY = "thorax-ai-analysis-stats";
const MAX_HISTORY_ITEMS = 8;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function readHistory(): Analysis[] {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as Analysis[]) : [];
  } catch (error) {
    console.error("Could not read saved analysis history.", error);
    return [];
  }
}

function readStats(): AnalysisStats {
  try {
    const stored = localStorage.getItem(STATS_STORAGE_KEY);
    if (!stored) return { total: 0, normal: 0, tuberculosis: 0 };
    const parsed: unknown = JSON.parse(stored);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "total" in parsed &&
      "normal" in parsed &&
      "tuberculosis" in parsed &&
      typeof parsed.total === "number" &&
      typeof parsed.normal === "number" &&
      typeof parsed.tuberculosis === "number"
    ) {
      return {
        total: parsed.total,
        normal: parsed.normal,
        tuberculosis: parsed.tuberculosis,
      };
    }
    return { total: 0, normal: 0, tuberculosis: 0 };
  } catch (error) {
    console.error("Could not read saved analysis statistics.", error);
    return { total: 0, normal: 0, tuberculosis: 0 };
  }
}

function App() {
  const [page, setPage] = useState<Page>("landing");
  const [history, setHistory] = useState<Analysis[]>(readHistory);
  const [stats, setStats] = useState<AnalysisStats>(readStats);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [currentResult, setCurrentResult] = useState<Analysis | null>(null);
  const [modelReady, setModelReady] = useState<boolean | null>(null);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [modelState, setModelState] = useState("checking");
  const [healthMessage, setHealthMessage] = useState("");
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const [apiError, setApiError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      const { data } = await api.get<HealthResponse>("/health");
      setApiConnected(data.api_ready);
      setModelReady(data.model_ready);
      setModelState(data.model.state);
      setHealthMessage(healthMessageForModel(data.model));
    } catch (error) {
      setApiConnected(false);
      setModelReady(false);
      setModelState("api_unavailable");
      setHealthMessage(
        axios.isAxiosError(error) && error.response
          ? `Health check failed with HTTP ${error.response.status}.`
          : "Cannot reach the prediction API at the configured address.",
      );
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
    const timer = window.setInterval(() => void refreshHealth(), 15_000);
    return () => window.clearInterval(timer);
  }, [refreshHealth]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const persistHistory = useCallback((nextHistory: Analysis[], newAnalysis: Analysis) => {
    setHistory(nextHistory);
    const nextStats: AnalysisStats = {
      total: stats.total + 1,
      normal: stats.normal + (newAnalysis.predictedClass === "NORMAL" ? 1 : 0),
      tuberculosis:
        stats.tuberculosis +
        (newAnalysis.predictedClass === "TUBERCULOSIS" ? 1 : 0),
    };
    setStats(nextStats);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(nextStats));
    } catch (error) {
      console.error("Could not save analysis history in this browser.", error);
      setApiError("Analysis completed, but browser storage could not save the history or totals. The result is still available.");
    }
  }, [stats]);

  const setFile = (file?: File) => {
    setFileError("");
    setApiError("");
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["png", "jpg", "jpeg"].includes(extension ?? "")) {
      setSelectedFile(null);
      setFileError("Choose a PNG, JPG, or JPEG image.");
      return;
    }
    if (file.type && !["image/png", "image/jpeg", "image/pjpeg"].includes(file.type)) {
      setSelectedFile(null);
      setFileError("The selected file is not a supported PNG or JPEG image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setSelectedFile(null);
      setFileError("The image must be smaller than 10 MB.");
      return;
    }
    setSelectedFile(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile || isAnalyzing) return;

    setApiError("");
    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const { data } = await api.post<PredictionResponse>(
        "/api/predictions/upload",
        formData,
      );
      if (
        !["NORMAL", "TUBERCULOSIS"].includes(data.predicted_class) ||
        !Number.isFinite(data.tb_score) ||
        data.tb_score < 0 ||
        data.tb_score > 1
      ) {
        throw new Error("The prediction API returned an invalid result.");
      }

      const thumbnail = await createThumbnail(selectedFile);
      const analysis: Analysis = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fileName: selectedFile.name,
        analyzedAt: data.prediction_timestamp ?? new Date().toISOString(),
        predictedClass: data.predicted_class,
        tbScore: data.tb_score,
        scoreIsCalibrated: data.score_is_calibrated,
        processingTimeMs: data.processing_time_ms,
        originalImage: thumbnail,
        maskImage: data.segmentation_mask_png_base64
          ? `data:image/png;base64,${data.segmentation_mask_png_base64}`
          : undefined,
        roiImage: data.lung_roi_png_base64
          ? `data:image/png;base64,${data.lung_roi_png_base64}`
          : undefined,
        gradCamImage: data.grad_cam_png_base64
          ? `data:image/png;base64,${data.grad_cam_png_base64}`
          : undefined,
      };
      setCurrentResult({
        ...analysis,
        originalImage: previewUrl,
        reportImage: thumbnail,
      });
      persistHistory([analysis, ...history].slice(0, MAX_HISTORY_ITEMS), analysis);
      setPage("results");
    } catch (error) {
      const responseDetail: unknown = axios.isAxiosError(error)
        ? error.response?.data?.detail
        : undefined;
      const detailMessage = formatApiError(responseDetail);
      setApiError(
        detailMessage ||
          (axios.isAxiosError(error) && !error.response
            ? "Could not reach the prediction API. Start the backend and verify the configured API address."
            : error instanceof Error
              ? error.message
              : "Analysis failed. Please try again."),
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openHistoryResult = (analysis: Analysis) => {
    setCurrentResult(analysis);
    setPage("results");
  };

  const startNewAnalysis = () => {
    setCurrentResult(null);
    setSelectedFile(null);
    setFileError("");
    setApiError("");
    setPage("upload");
  };

  if (page === "landing") {
    return (
      <LandingPage
        modelReady={modelReady}
        apiConnected={apiConnected}
        healthMessage={healthMessage}
        onGetStarted={() => setPage("dashboard")}
        onAnalyze={startNewAnalysis}
      />
    );
  }

  return (
    <div className="app-shell min-h-screen bg-[#f5f8fc] text-slate-900">
      {mobileMenuOpen && (
        <button
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside
        className={`sidebar fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <a
          href="#dashboard"
          onClick={(event) => {
            event.preventDefault();
            setPage("dashboard");
            setMobileMenuOpen(false);
          }}
          className="flex items-center gap-3 border-b border-slate-100 px-6 py-6"
        >
          <span className="grid size-11 place-items-center rounded-2xl bg-[#163f68] text-white shadow-lg shadow-blue-950/15">
            <HeartPulse size={23} />
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight text-[#122d49]">
              thorax<span className="text-[#4c9bd4]">.ai</span>
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.17em] text-slate-400">
              TB research screening
            </span>
          </span>
        </a>

        <div className="px-4 pt-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.17em] text-slate-400">
            Workspace
          </p>
          <nav className="space-y-1">
            <SidebarLink
              active={page === "dashboard"}
              icon={<LayoutDashboard size={18} />}
              label="Overview"
              onClick={() => {
                setPage("dashboard");
                setMobileMenuOpen(false);
              }}
            />
            <SidebarLink
              active={page === "upload"}
              icon={<ScanLine size={18} />}
              label="New analysis"
              onClick={() => {
                startNewAnalysis();
                setMobileMenuOpen(false);
              }}
            />
            <SidebarLink
              active={page === "history"}
              icon={<History size={18} />}
              label="Analysis history"
              onClick={() => {
                setPage("history");
                setMobileMenuOpen(false);
              }}
              trailing={history.length ? String(history.length) : undefined}
            />
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-2xl border border-blue-100 bg-[#f3f8fd] p-4">
            <div className="flex items-center gap-2 text-[#163f68]">
              <ShieldCheck size={17} />
              <p className="text-xs font-semibold">Private by design</p>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              Images are sent to the configured model API. Your history is
              stored only in this browser.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2 px-2 text-[10px] leading-4 text-slate-400">
            <Stethoscope size={14} className="shrink-0" />
            Research prototype · Not for clinical use
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[260px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <button
              className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 lg:hidden"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={19} />
            </button>
            <div>
              <p className="text-sm font-semibold text-[#16334f]">
                {pageTitle(page)}
              </p>
              <p className="hidden text-[11px] text-slate-400 sm:block">
                Research screening workspace
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium sm:flex ${
                apiConnected && modelReady
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-amber-100 bg-amber-50 text-amber-700"
              }`}
              title={healthMessage || "Checking prediction API"}
            >
              <span
                className={`size-1.5 rounded-full ${
                  apiConnected && modelReady ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              {isCheckingHealth && apiConnected === null
                ? "Checking API"
                : apiConnected === false
                  ? "API offline"
                : modelReady
                  ? healthMessage.includes("grayscale CNN")
                    ? "Ready (CNN)"
                    : healthMessage.includes("classical")
                      ? "Ready (classical ROI)"
                      : "Models ready"
                  : modelState === "missing_artifacts"
                    ? "Model files missing"
                    : "Model unavailable"}
            </div>
            <button
              onClick={startNewAnalysis}
              className="inline-flex items-center gap-2 rounded-xl bg-[#163f68] px-3.5 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-950/10 transition hover:bg-[#102f50] sm:px-4 sm:text-sm"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">New analysis</span>
              <span className="sm:hidden">Analyze</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {page === "dashboard" && (
                <Dashboard
                  history={history}
                  stats={stats}
                  modelReady={modelReady}
                  apiConnected={apiConnected}
                  healthMessage={healthMessage}
                  onAnalyze={startNewAnalysis}
                  onViewHistory={() => setPage("history")}
                  onOpenResult={openHistoryResult}
                />
              )}
              {page === "upload" && (
                <UploadPage
                  file={selectedFile}
                  previewUrl={previewUrl}
                  fileError={fileError}
                  apiError={apiError}
                  healthMessage={healthMessage}
                  isDragging={isDragging}
                  isAnalyzing={isAnalyzing}
                  modelReady={modelReady}
                  apiConnected={apiConnected}
                  fileInputRef={fileInputRef}
                  onFile={setFile}
                  onRemove={() => {
                    setSelectedFile(null);
                    setFileError("");
                    setApiError("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  onAnalyze={handleAnalyze}
                  onDragChange={setIsDragging}
                  onBack={() => setPage("dashboard")}
                />
              )}
              {page === "history" && (
                <HistoryPage
                  history={history}
                  onAnalyze={startNewAnalysis}
                  onOpenResult={openHistoryResult}
                />
              )}
              {page === "results" && currentResult && (
                <ResultsPage
                  result={currentResult}
                  notice={apiError}
                  onBack={() =>
                    setPage(history.some((item) => item.id === currentResult.id) ? "history" : "dashboard")
                  }
                  onAnalyze={startNewAnalysis}
                />
              )}
              {page === "results" && !currentResult && (
                <EmptyState
                  icon={<FileImage size={24} />}
                  title="No analysis selected"
                  description="Choose an analysis from your history or start a new one."
                  action="Start a new analysis"
                  onAction={startNewAnalysis}
                />
              )}
            </motion.div>
          </AnimatePresence>
          <footer className="mt-12 flex flex-col gap-2 border-t border-slate-200 pt-5 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>thorax.ai · Educational research prototype</span>
            <span>AI results may be incorrect and are not a medical diagnosis.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function LandingPage({
  modelReady,
  apiConnected,
  healthMessage,
  onGetStarted,
  onAnalyze,
}: {
  modelReady: boolean | null;
  apiConnected: boolean | null;
  healthMessage: string;
  onGetStarted: () => void;
  onAnalyze: () => void;
}) {
  const readinessLabel =
    apiConnected === null
      ? "Checking inference service"
      : apiConnected === false
        ? "Inference API offline"
        : modelReady
          ? "Inference service ready"
          : modelStateLabel(healthMessage);

  return (
    <div className="landing-shell min-h-screen text-slate-900">
      <section id="top" className="landing-hero relative flex flex-col">
        <div className="landing-hero__media" aria-hidden="true">
          <motion.img
            src="/images/hero-cxr.svg"
            alt=""
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
          <div className="landing-hero__veil" />
          <div className="landing-hero__grain" />
        </div>

        <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center gap-6 px-5 py-5 lg:px-8">
          <a href="#top" className="font-display shrink-0 text-lg font-bold tracking-tight text-white">
            thorax<span className="text-[#7eb7dc]">.ai</span>
          </a>
          <nav className="hidden items-center gap-7 text-sm font-medium text-white/70 md:flex">
            <a className="transition hover:text-white" href="#how-it-works">Workflow</a>
            <a className="transition hover:text-white" href="#about">Model</a>
            <a className="transition hover:text-white" href="#evaluation">Metrics</a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 text-[11px] font-medium text-white/75 sm:flex">
              <span className={`size-1.5 rounded-sm ${apiConnected && modelReady ? "bg-emerald-400" : "bg-amber-300"}`} />
              {readinessLabel}
            </div>
            <button
              onClick={onGetStarted}
              className="landing-cta rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/18"
            >
              Open workspace
            </button>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 pb-16 pt-24 sm:pb-20 lg:px-8 lg:pb-24">
          <motion.p
            className="landing-brand text-[clamp(3rem,9vw,7rem)] text-white"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            thorax<span className="text-[#7eb7dc]">.ai</span>
          </motion.p>

          <motion.h1
            className="font-display mt-5 max-w-3xl text-[clamp(1.7rem,3.4vw,3rem)] font-semibold tracking-tight text-white"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            Chest X-ray screening for tuberculosis research.
          </motion.h1>

          <motion.p
            className="mt-4 max-w-xl text-base leading-7 text-white/75 sm:text-lg"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22 }}
          >
            Run your configured model on a frontal radiograph and review the
            returned class score with optional lung-region visuals.
          </motion.p>

          <motion.div
            className="mt-9 flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.32 }}
          >
            <button
              onClick={onAnalyze}
              className="landing-cta inline-flex items-center gap-2 rounded-lg bg-[#d7e8f4] px-5 py-3.5 text-sm font-semibold text-[#0b1c2c] hover:bg-white"
            >
              Analyze an X-ray
              <ArrowRight size={17} />
            </button>
            <a
              href="#how-it-works"
              className="landing-cta inline-flex items-center gap-2 rounded-lg border border-white/30 px-5 py-3.5 text-sm font-semibold text-white hover:border-white/55"
            >
              See the workflow
              <ArrowDown size={16} />
            </a>
          </motion.div>
        </div>
      </section>

      <main>
        <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
          <SectionHeading
            eyebrow="Workflow"
            title="Three steps from upload to output"
            description="Send a supported chest X-ray to your inference service and review the model response in one pass."
          />
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              { step: "01", title: "Upload", text: "Choose a PNG, JPG, or JPEG chest radiograph and confirm the preview." },
              { step: "02", title: "Infer", text: "The configured segmentation and classification path processes the image." },
              { step: "03", title: "Review", text: "Inspect the class label, uncalibrated score, and any returned ROI visuals." },
            ].map((item, index) => (
              <motion.li
                key={item.step}
                className="relative"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
              >
                <p className="font-display text-4xl font-bold tracking-tight text-[#2f7eb0]/35">{item.step}</p>
                <h3 className="mt-3 font-display text-xl font-semibold text-[#122d49]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </motion.li>
            ))}
          </ol>
        </section>

        <div className="landing-section-rule mx-auto max-w-7xl" />

        <section id="about" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <SectionHeading
              eyebrow="Model"
              title="Your checkpoints. Your inference path."
              description="The interface talks to the configured FastAPI service. It does not retrain models or invent substitute predictions."
            />
            <p className="max-w-md text-sm leading-7 text-slate-600 lg:pb-1">
              Depending on the loaded artifacts, analysis may follow the notebook
              U-Net + DenseNet path or the available grayscale classifier. Scores
              remain uncalibrated research outputs, not clinical probabilities.
            </p>
          </div>
          <div className="mt-12 grid gap-8 border-t border-slate-200/80 pt-10 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2f7eb0]">Stage one</p>
              <h3 className="font-display mt-3 text-2xl font-semibold text-[#122d49]">Lung region focus</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Segmentation isolates the thorax region before classification whenever a compatible U-Net checkpoint is present.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2f7eb0]">Stage two</p>
              <h3 className="font-display mt-3 text-2xl font-semibold text-[#122d49]">Binary research score</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                The classifier returns a Normal or Tuberculosis label with an uncalibrated sigmoid score for academic review.
              </p>
            </div>
          </div>
        </section>

        <section id="evaluation" className="bg-[#eaf1f7]/70 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionHeading
              eyebrow="Notebook evaluation"
              title="Recorded dataset results"
              description="Historical notebook metrics summarize past evaluation. They are not predictions for newly uploaded images."
            />
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <EvaluationCard
                title="DenseNet121 · Classification"
                subtitle="Held-out test set · 140 images"
                metrics={[
                  ["Accuracy", "96.43%"],
                  ["AUC", "98.90%"],
                  ["TB recall", "94.29%"],
                  ["Specificity", "98.57%"],
                  ["TB precision", "99.00%"],
                ]}
              />
              <EvaluationCard
                title="U-Net · Segmentation"
                subtitle="Recorded test and best-fold validation results"
                metrics={[
                  ["Test accuracy", "96.45%"],
                  ["Test Dice", "88.93%"],
                  ["Manual Dice", "92.74%"],
                  ["Best-fold val. accuracy", "96.23%"],
                  ["Best-fold val. Dice", "88.64%"],
                ]}
              />
            </div>
            <p className="mt-5 text-[11px] leading-5 text-slate-500">
              Source: saved notebook outputs, reported as recorded and not independently re-evaluated.
            </p>
          </div>
        </section>

        <section id="safety" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="flex gap-4 border-l-2 border-amber-500/70 bg-amber-50/80 px-5 py-5 text-amber-950">
            <Stethoscope className="mt-0.5 shrink-0" size={20} />
            <div>
              <h3 className="font-display text-base font-semibold">Research and education only</h3>
              <p className="mt-2 text-sm leading-6 text-amber-950/80">
                This application is not a medical device and does not provide a diagnosis.
                AI results may be incorrect; do not use them for health decisions.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span className="font-display text-base font-semibold text-[#122d49]">thorax.ai</span>
          <span>TB research screening · Educational prototype · Not for clinical use</span>
        </div>
      </footer>
    </div>
  );
}

function Dashboard({
  history,
  stats,
  modelReady,
  apiConnected,
  healthMessage,
  onAnalyze,
  onViewHistory,
  onOpenResult,
}: {
  history: Analysis[];
  stats: AnalysisStats;
  modelReady: boolean | null;
  apiConnected: boolean | null;
  healthMessage: string;
  onAnalyze: () => void;
  onViewHistory: () => void;
  onOpenResult: (analysis: Analysis) => void;
}) {
  const chartData = useMemo(() => {
    const days = new Map<string, { date: string; normal: number; tuberculosis: number }>();
    for (const item of history) {
      const date = new Date(item.analyzedAt);
      const key = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const existing = days.get(key) ?? { date: key, normal: 0, tuberculosis: 0 };
      existing[item.predictedClass === "NORMAL" ? "normal" : "tuberculosis"] += 1;
      days.set(key, existing);
    }
    return Array.from(days.values()).reverse();
  }, [history]);

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3986bd]">Workspace overview</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#16334f] sm:text-[30px]">Good to see you</h1>
          <p className="mt-2 text-sm text-slate-500">Your recent model activity, all in one place.</p>
        </div>
        <button onClick={onAnalyze} className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#163f68] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#102f50]">
          <Plus size={17} /> Start an analysis
        </button>
      </div>

      <div className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 ${
        apiConnected && modelReady ? "border-emerald-100 bg-emerald-50/70" : "border-amber-100 bg-amber-50/70"
      }`}>
        {apiConnected && modelReady ? <CheckCircle2 size={19} className="mt-0.5 text-emerald-600" /> : <Activity size={19} className="mt-0.5 text-amber-600" />}
        <div>
          <p className={`text-sm font-semibold ${apiConnected && modelReady ? "text-emerald-900" : "text-amber-900"}`}>
            {apiConnected === false
              ? "Prediction API is not reachable"
              : apiConnected === null
                ? "Checking prediction API"
                : modelReady
                  ? "Inference service is ready"
                  : "Prediction API connected; model unavailable"}
          </p>
          <p className={`mt-1 text-xs leading-5 ${apiConnected && modelReady ? "text-emerald-800/80" : "text-amber-800/80"}`}>
            {apiConnected && modelReady
              ? "The configured trained models are available for image analysis."
              : healthMessage || "Start FastAPI and configure the trained U-Net and DenseNet checkpoint files."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={<FileImage size={19} />} label="Images analyzed" value={stats.total} caption="Total results analyzed here" accent="blue" />
        <StatCard icon={<CheckCircle2 size={19} />} label="Normal predictions" value={stats.normal} caption={stats.total ? `${Math.round((stats.normal / stats.total) * 100)}% of all results` : "No results yet"} accent="green" />
        <StatCard icon={<Activity size={19} />} label="TB-positive predictions" value={stats.tuberculosis} caption={stats.total ? `${Math.round((stats.tuberculosis / stats.total) * 100)}% of all results` : "No results yet"} accent="violet" />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#16334f]">Analysis activity</h2>
              <p className="mt-1 text-xs text-slate-500">Predictions saved in this browser</p>
            </div>
            <span className="rounded-lg bg-[#f3f8fd] p-2 text-[#3986bd]"><BarChart3 size={17} /></span>
          </div>
          {chartData.length ? (
            <div className="mt-5 h-[245px] w-full">
              <Suspense fallback={<div className="h-full animate-pulse rounded-xl bg-slate-50" />}>
                <AnalysisChart data={chartData} />
              </Suspense>
            </div>
          ) : (
            <div className="mt-5 grid h-[245px] place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
              <div>
                <span className="mx-auto grid size-11 place-items-center rounded-xl bg-white text-slate-400 shadow-sm"><BarChart3 size={20} /></span>
                <p className="mt-3 text-sm font-medium text-slate-700">No analysis activity yet</p>
                <p className="mt-1 text-xs text-slate-400">Your real model results will appear here.</p>
              </div>
            </div>
          )}
          {chartData.length > 0 && (
            <div className="mt-1 flex justify-center gap-5 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#64a890]" />Normal</span>
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#d89a6b]" />Tuberculosis</span>
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#16334f]">Recent analyses</h2>
              <p className="mt-1 text-xs text-slate-500">Latest saved predictions</p>
            </div>
            <button onClick={onViewHistory} className="inline-flex items-center gap-1 text-xs font-semibold text-[#3986bd] hover:text-[#163f68]">
              View all <ChevronRight size={15} />
            </button>
          </div>
          {history.length ? (
            <div className="mt-4 divide-y divide-slate-100">
              {history.slice(0, 4).map((item) => (
                <button key={item.id} onClick={() => onOpenResult(item)} className="flex w-full items-center gap-3 py-3 text-left transition hover:bg-slate-50">
                  <img src={item.originalImage} alt="" className="size-11 rounded-xl border border-slate-100 bg-slate-100 object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-slate-700">{item.fileName}</span>
                    <span className="mt-1 block text-[10px] text-slate-400">{formatDate(item.analyzedAt)}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold ${
                    item.predictedClass === "NORMAL" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}>{shortClass(item.predictedClass)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4 grid min-h-[245px] place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
              <div>
                <span className="mx-auto grid size-11 place-items-center rounded-xl bg-white text-slate-400 shadow-sm"><History size={20} /></span>
                <p className="mt-3 text-sm font-medium text-slate-700">Your history is waiting</p>
                <p className="mt-1 text-xs text-slate-400">Complete an analysis to add a result.</p>
                <button onClick={onAnalyze} className="mt-4 text-xs font-semibold text-[#3986bd]">Analyze an X-ray <ArrowRight className="ml-1 inline" size={13} /></button>
              </div>
            </div>
          )}
        </section>
      </div>
      <p className="mt-5 flex items-center gap-2 text-[10px] leading-5 text-slate-400"><ShieldCheck size={13} />Dashboard metrics reflect only results saved locally in this browser.</p>
    </div>
  );
}

function UploadPage({
  file,
  previewUrl,
  fileError,
  apiError,
  healthMessage,
  isDragging,
  isAnalyzing,
  modelReady,
  apiConnected,
  fileInputRef,
  onFile,
  onRemove,
  onAnalyze,
  onDragChange,
  onBack,
}: {
  file: File | null;
  previewUrl: string;
  fileError: string;
  apiError: string;
  healthMessage: string;
  isDragging: boolean;
  isAnalyzing: boolean;
  modelReady: boolean | null;
  apiConnected: boolean | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFile: (file?: File) => void;
  onRemove: () => void;
  onAnalyze: () => void;
  onDragChange: (dragging: boolean) => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-[#163f68]"><ArrowLeft size={15} />Back to overview</button>
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3986bd]">New analysis</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#16334f] sm:text-[30px]">Upload a chest X-ray</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Select a clear frontal chest X-ray to send to your existing inference model.</p>
      </div>

      {(apiConnected === false || (apiConnected && modelReady === false)) && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <Activity size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {apiConnected === false ? "Prediction API is offline" : "Model checkpoints unavailable"}
            </p>
            <p className="mt-1 text-xs leading-5">
              {healthMessage || "Start the backend and verify the configured trained model checkpoints. You can still select an image."}
            </p>
          </div>
        </div>
      )}

      <section
        className={`rounded-2xl border-2 border-dashed p-5 transition sm:p-8 ${
          isDragging ? "border-[#3986bd] bg-blue-50/70" : "border-slate-200 bg-white"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          onDragChange(true);
        }}
        onDragLeave={() => onDragChange(false)}
        onDrop={(event) => {
          event.preventDefault();
          onDragChange(false);
          onFile(event.dataTransfer.files[0]);
        }}
      >
        {file && previewUrl ? (
          <div className="grid gap-6 md:grid-cols-[1fr_0.85fr] md:items-center">
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-[#102338]">
              <img src={previewUrl} alt="Selected chest X-ray preview" className="mx-auto max-h-[360px] w-full object-contain" />
              <div className="absolute bottom-3 left-3 rounded-lg bg-slate-950/65 px-2.5 py-1.5 text-[10px] font-medium text-white backdrop-blur">Image preview</div>
            </div>
            <div>
              <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-[#3986bd]"><FileImage size={21} /></span>
              <h2 className="mt-4 break-all text-base font-semibold text-[#16334f]">{file.name}</h2>
              <p className="mt-1 text-xs text-slate-400">{formatBytes(file.size)} · {file.type || "Image"}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-[#163f68]"><Upload size={14} />Replace image</button>
                <button onClick={onRemove} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-red-200 hover:text-red-600"><Trash2 size={14} />Remove</button>
              </div>
              <div className="mt-6 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500">
                <ShieldCheck className="mt-0.5 shrink-0 text-emerald-600" size={15} />
                This image is sent to the configured API for inference. Avoid including identifying patient information.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
            <span className={`grid size-14 place-items-center rounded-2xl ${isDragging ? "bg-[#163f68] text-white" : "bg-[#edf5fb] text-[#3986bd]"}`}>
              <Upload size={23} />
            </span>
            <h2 className="mt-5 text-base font-semibold text-[#16334f]">{isDragging ? "Drop your X-ray here" : "Drag and drop your X-ray here"}</h2>
            <p className="mt-2 text-xs text-slate-400">or browse files from your device</p>
            <button onClick={() => fileInputRef.current?.click()} className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-[#163f68] shadow-sm transition hover:border-blue-300 hover:bg-blue-50">Browse files</button>
            <p className="mt-5 text-[10px] text-slate-400">PNG, JPG, or JPEG · Maximum 10 MB</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          className="hidden"
          onChange={(event) => {
            onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </section>

      {(fileError || apiError) && (
        <div role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">{fileError || apiError}</div>
      )}

      <div className="mt-6 flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-[10px] leading-5 text-slate-400">For research and education only. This tool is not for clinical use.</p>
        <button
          onClick={onAnalyze}
          disabled={!file || isAnalyzing || apiConnected === false || modelReady === false}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#163f68] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-950/10 transition hover:bg-[#102f50] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {isAnalyzing ? <><LoaderCircle size={17} className="animate-spin" />Analyzing image…</> : <><ScanLine size={17} />Analyze X-ray</>}
        </button>
      </div>
      {isAnalyzing && (
        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
          <div className="flex items-center gap-3">
            <LoaderCircle className="animate-spin text-[#3986bd]" size={19} />
            <div>
              <p className="text-xs font-semibold text-[#163f68]">Running your image through the model</p>
              <p className="mt-1 text-[10px] text-slate-500">U-Net segmentation and DenseNet121 classification may take a moment.</p>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-blue-100"><div className="loading-bar h-full rounded-full bg-[#3986bd]" /></div>
        </div>
      )}
    </div>
  );
}

function ResultsPage({
  result,
  notice,
  onBack,
  onAnalyze,
}: {
  result: Analysis;
  notice: string;
  onBack: () => void;
  onAnalyze: () => void;
}) {
  const isTb = result.predictedClass === "TUBERCULOSIS";
  const score = isTb ? result.tbScore : 1 - result.tbScore;
  const [reportError, setReportError] = useState("");
  const handleReportDownload = async () => {
    try {
      await downloadReport(result);
      setReportError("");
    } catch (error) {
      console.error("Could not generate the analysis PDF report.", error);
      setReportError("The PDF report could not be generated. Please try again.");
    }
  };
  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <button onClick={onBack} className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-[#163f68]"><ArrowLeft size={15} />Back</button>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3986bd]">Analysis result</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#16334f] sm:text-[30px]">Prediction summary</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void handleReportDownload()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:text-[#163f68]"><FileText size={15} />Download report</button>
          <button onClick={onAnalyze} className="inline-flex items-center gap-2 rounded-xl bg-[#163f68] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#102f50]"><Plus size={15} />New analysis</button>
        </div>
      </div>

      <section className={`rounded-2xl border p-5 sm:p-6 ${
        isTb ? "border-amber-200 bg-amber-50/70" : "border-emerald-200 bg-emerald-50/70"
      }`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${
              isTb ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
            }`}>{isTb ? <Activity size={23} /> : <CheckCircle2 size={23} />}</span>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isTb ? "text-amber-700" : "text-emerald-700"}`}>Model prediction</p>
              <h2 className={`mt-1 text-xl font-semibold ${isTb ? "text-amber-950" : "text-emerald-950"}`}>{isTb ? "Tuberculosis" : "Normal"}</h2>
              <p className={`mt-1 text-xs ${isTb ? "text-amber-800/75" : "text-emerald-800/75"}`}>{result.fileName}</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-3xl font-semibold tabular-nums text-[#16334f]">{(score * 100).toFixed(1)}%</p>
            <p className="mt-1 text-[10px] font-medium text-slate-500">Model score · uncalibrated</p>
          </div>
        </div>
      </section>
      {notice && <div role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">{notice}</div>}
      {reportError && <div role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">{reportError}</div>}

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1.5"><Clock3 size={13} />{formatDate(result.analyzedAt)}</span>
        {result.processingTimeMs !== undefined && <span className="flex items-center gap-1.5"><Activity size={13} />{(result.processingTimeMs / 1000).toFixed(2)} sec processing</span>}
        <span className="flex items-center gap-1.5"><ShieldCheck size={13} />{result.scoreIsCalibrated ? "Calibrated score" : "Score is not a calibrated probability"}</span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <ImageResultCard title="Original X-ray" image={result.originalImage} alt="Uploaded chest X-ray" />
        {result.maskImage && <ImageResultCard title="Segmentation mask" image={result.maskImage} alt="Model-generated segmentation mask" />}
        {result.roiImage && <ImageResultCard title="Lung region of interest" image={result.roiImage} alt="Model-generated lung region of interest" />}
        {result.gradCamImage && <ImageResultCard title="Grad-CAM visualization" image={result.gradCamImage} alt="Model-generated Grad-CAM visualization" />}
      </div>

      {!result.maskImage && !result.roiImage && !result.gradCamImage && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500">
          This response did not include segmentation or ROI visualizations.
        </div>
      )}
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
        <Stethoscope className="mt-0.5 shrink-0" size={19} />
        <div>
          <h3 className="text-xs font-bold">Research and education only</h3>
          <p className="mt-1 text-xs leading-5 text-amber-900/80">This model output is not a medical diagnosis. Its score is an uncalibrated model score and should not guide clinical or treatment decisions. Consult a qualified healthcare professional.</p>
        </div>
      </div>
    </div>
  );
}

function HistoryPage({
  history,
  onAnalyze,
  onOpenResult,
}: {
  history: Analysis[];
  onAnalyze: () => void;
  onOpenResult: (analysis: Analysis) => void;
}) {
  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3986bd]">Saved locally</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#16334f] sm:text-[30px]">Analysis history</h1>
          <p className="mt-2 text-sm text-slate-500">{history.length} {history.length === 1 ? "saved result" : "saved results"} in this browser</p>
        </div>
        <button onClick={onAnalyze} className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#163f68] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#102f50]"><Plus size={17} />New analysis</button>
      </div>
      {history.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(230px,1.5fr)_minmax(145px,1fr)_minmax(110px,0.8fr)_100px] gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400 md:grid">
            <span>Image</span><span>Prediction</span><span>Analyzed</span><span></span>
          </div>
          <div className="divide-y divide-slate-100">
            {history.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 px-4 py-4 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:px-5">
                <div className="flex min-w-0 flex-1 items-center gap-3 md:flex-[1.5]">
                  <img src={item.originalImage} alt="" className="size-12 shrink-0 rounded-xl border border-slate-100 bg-slate-100 object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-slate-700">{item.fileName}</span>
                    <span className="mt-1 block text-[10px] text-slate-400">{(item.tbScore * 100).toFixed(1)}% TB model score</span>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 sm:min-w-[145px] md:flex-1">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    item.predictedClass === "NORMAL" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}>{shortClass(item.predictedClass)}</span>
                  <span className="text-[10px] text-slate-400 md:hidden">{formatDate(item.analyzedAt)}</span>
                </div>
                <span className="hidden text-[10px] text-slate-500 md:block md:flex-1">{formatDate(item.analyzedAt)}</span>
                <button onClick={() => onOpenResult(item)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-600 transition hover:border-blue-200 hover:text-[#163f68]">
                  View result <ArrowUpRight size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<History size={24} />}
          title="No saved analyses yet"
          description="Completed predictions are saved in this browser so you can return to their results later."
          action="Analyze an X-ray"
          onAction={onAnalyze}
        />
      )}
      <p className="mt-4 text-[10px] leading-5 text-slate-400">History is stored in this browser only and is limited to the latest {MAX_HISTORY_ITEMS} results. It is not uploaded to the backend or shared across devices.</p>
    </div>
  );
}

function ImageResultCard({ title, image, alt }: { title: string; image: string; alt: string }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-xs font-semibold text-[#16334f]">{title}</h3>
        <Check size={15} className="text-emerald-600" />
      </div>
      <div className="grid min-h-[220px] place-items-center bg-[#102338] p-4">
        <img src={image} alt={alt} className="max-h-[320px] max-w-full object-contain" />
      </div>
    </section>
  );
}

function SidebarLink({
  active,
  icon,
  label,
  onClick,
  trailing,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  trailing?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition ${
        active
          ? "bg-[#edf5fb] text-[#163f68]"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {trailing && <span className="rounded-md bg-white px-1.5 py-0.5 text-[9px] text-slate-400">{trailing}</span>}
    </button>
  );
}

function StatCard({
  icon,
  label,
  value,
  caption,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  caption: string;
  accent: "blue" | "green" | "violet";
}) {
  const colors = {
    blue: "bg-blue-50 text-[#3986bd]",
    green: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className={`grid size-9 place-items-center rounded-xl ${colors[accent]}`}>{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-[#16334f]">{value}</p>
      <p className="mt-1 text-[10px] text-slate-400">{caption}</p>
    </article>
  );
}

function EvaluationCard({
  title,
  subtitle,
  metrics,
}: {
  title: string;
  subtitle: string;
  metrics: [string, string][];
}) {
  return (
    <article className="border border-slate-200/90 bg-white/90 p-6">
      <h3 className="font-display text-lg font-semibold text-[#16334f]">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
        {metrics.map(([label, value]) => (
          <div key={label}>
            <p className="text-[11px] text-slate-500">{label}</p>
            <p className="mt-1 font-display text-xl font-semibold tabular-nums text-[#163f68]">{value}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2f7eb0]">{eyebrow}</p>
      <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-[#122d49] sm:text-4xl">{title}</h2>
      <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="grid min-h-[300px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#edf5fb] text-[#3986bd]">{icon}</span>
        <h2 className="mt-4 text-base font-semibold text-[#16334f]">{title}</h2>
        <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
        <button onClick={onAction} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#163f68] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#102f50]">{action}<ArrowRight size={14} /></button>
      </div>
    </div>
  );
}

async function createThumbnail(file: File): Promise<string> {
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 720 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    image.close();
    throw new Error("Could not prepare an image preview.");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  return canvas.toDataURL("image/jpeg", 0.72);
}

async function downloadReport(result: Analysis) {
  const { jsPDF } = await import("jspdf");
  const report = new jsPDF();
  const isTb = result.predictedClass === "TUBERCULOSIS";
  const modelScore = isTb ? result.tbScore : 1 - result.tbScore;
  const date = new Date(result.analyzedAt);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  report.setFillColor(22, 63, 104);
  report.rect(0, 0, 210, 34, "F");
  report.setTextColor(255, 255, 255);
  report.setFont("helvetica", "bold");
  report.setFontSize(18);
  report.text("Thorax AI | Analysis report", 18, 19);
  report.setFont("helvetica", "normal");
  report.setFontSize(9);
  report.text("Educational research prototype | Not for clinical use", 18, 27);
  report.setTextColor(22, 45, 70);
  report.setFont("helvetica", "bold");
  report.setFontSize(14);
  report.text("Prediction summary", 18, 48);
  report.setFont("helvetica", "normal");
  report.setFontSize(10);
  report.text(`Image: ${result.fileName.slice(0, 70)}`, 18, 59, { maxWidth: 174 });
  report.text(`Predicted class: ${isTb ? "Tuberculosis" : "Normal"}`, 18, 68);
  report.text(`Model score: ${(modelScore * 100).toFixed(1)}% (uncalibrated)`, 18, 77);
  report.text(`Analysis date: ${formatDate(result.analyzedAt)}`, 18, 86);
  if (result.processingTimeMs !== undefined) {
    report.text(`Processing time: ${(result.processingTimeMs / 1000).toFixed(2)} seconds`, 18, 95);
  }

  const imageY = 108;
  const originalImage = result.reportImage ?? result.originalImage;
  report.addImage(originalImage, "JPEG", 18, imageY, 78, 60, undefined, "FAST");
  report.setFontSize(8);
  report.text("Original X-ray", 18, imageY + 64);
  if (result.maskImage) {
    report.addImage(result.maskImage, "PNG", 108, imageY, 38, 38, undefined, "FAST");
    report.text("Segmentation mask", 108, imageY + 43);
  }
  if (result.roiImage) {
    report.addImage(result.roiImage, "PNG", 154, imageY, 38, 38, undefined, "FAST");
    report.text("Lung ROI", 154, imageY + 43);
  }
  if (result.gradCamImage) {
    report.addImage(result.gradCamImage, "PNG", 108, imageY + 54, 38, 38, undefined, "FAST");
    report.text("Grad-CAM", 108, imageY + 97);
  }
  report.setTextColor(120, 80, 20);
  report.setFontSize(9);
  report.text(
    "Research use only. This AI output is not a medical diagnosis. Model scores are not calibrated probabilities and must not guide clinical decisions.",
    18,
    258,
    { maxWidth: 174 },
  );
  report.save(`thorax-ai-report-${safeDate.toISOString().slice(0, 10)}.pdf`);
}

function pageTitle(page: Page) {
  const titles: Record<Page, string> = {
    landing: "Welcome",
    dashboard: "Overview",
    upload: "New analysis",
    history: "Analysis history",
    results: "Prediction results",
  };
  return titles[page];
}

function healthMessageForModel(model: HealthResponse["model"]) {
  if (model.state === "missing_artifacts") {
    const missing = model.missing_artifacts.join(", ");
    return missingCheckpointMessage(missing || "classifier checkpoint");
  }
  if (model.state === "ready" && model.pipeline === "grayscale_cnn") {
    return "Classifier is ready. The configured checkpoint is a grayscale CNN (512×512), so analysis runs without the notebook U-Net + DenseNet path.";
  }
  if (model.state === "ready" && model.segmentation_backend === "classical_fallback") {
    return "DenseNet is ready. U-Net checkpoint is missing, so classical lung segmentation is used until you restore unet_model_fold_3.h5.";
  }
  return model.error || healthMessageForState(model.state);
}

function missingCheckpointMessage(checkpoints: string) {
  return `Missing trained checkpoints: ${checkpoints}. Restore the original files first. Set their paths in backend/.env only if they exist in another location, then restart the API.`;
}

function healthMessageForState(state: string) {
  switch (state) {
    case "ready":
      return "Trained U-Net and DenseNet models are ready.";
    case "missing_artifacts":
      return missingCheckpointMessage("U-Net and DenseNet121");
    case "loading":
      return "The trained models are loading.";
    case "error":
      return "The trained model checkpoints could not be loaded.";
    default:
      return "The model service has not completed initialization.";
  }
}

function formatApiError(detail: unknown) {
  if (typeof detail === "string") return detail;
  if (typeof detail !== "object" || detail === null) return "";

  const payload = detail as Record<string, unknown>;
  const message = typeof payload.message === "string" ? payload.message : "";
  const missing = Array.isArray(payload.missing_artifacts)
    ? payload.missing_artifacts.filter(
        (name): name is string => typeof name === "string",
      )
    : [];
  if (payload.model_state === "missing_artifacts" || missing.length > 0) {
    const checkpoints = missing.length ? missing.join(", ") : "U-Net and DenseNet121";
    return missingCheckpointMessage(checkpoints);
  }

  const additionalMissing = missing.filter((name) => !message.includes(name));
  return [
    message,
    ...(additionalMissing.length
      ? [`Missing checkpoints: ${additionalMissing.join(", ")}`]
      : []),
  ]
    .filter(Boolean)
    .join(" ");
}

function modelStateLabel(message: string) {
  if (message.includes("missing")) return "Model checkpoints missing";
  if (message.includes("could not be loaded")) return "Model load failed";
  if (message.includes("loading")) return "Models loading";
  return "Model unavailable";
}

function shortClass(predictedClass: Analysis["predictedClass"]) {
  return predictedClass === "NORMAL" ? "Normal" : "Tuberculosis";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default App;
