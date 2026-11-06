import { motion } from "framer-motion";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

const classificationMetrics = [
  { name: "Accuracy", value: 96.43 },
  { name: "AUC", value: 98.9 },
  { name: "TB recall", value: 94.29 },
  { name: "Specificity", value: 98.57 },
  { name: "TB precision", value: 99 },
];

const segmentationMetrics = [
  { name: "Test accuracy", value: 96.45 },
  { name: "Test Dice", value: 88.93 },
  { name: "Manual Dice", value: 92.74 },
  { name: "Best-fold val. accuracy", value: 96.23 },
  { name: "Best-fold val. Dice", value: 88.64 },
];

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a className="flex items-center gap-3" href="#home" aria-label="Thorax AI home">
            <span className="grid size-11 place-items-center rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-900/15">
              <HeartPulse size={23} strokeWidth={2.2} />
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight text-slate-900">
                thorax<span className="text-teal-700">.ai</span>
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.19em] text-slate-500">
                Research screening
              </span>
            </span>
          </a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a className="transition hover:text-teal-800" href="#technology">
              Technology
            </a>
            <a className="transition hover:text-teal-800" href="#workflow">
              Workflow
            </a>
            <a className="transition hover:text-teal-800" href="#results">
              Notebook results
            </a>
          </nav>
        </div>
      </header>

      <main id="home">
        <section className="relative overflow-hidden">
          <div className="hero-glow pointer-events-none absolute inset-0" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-28 lg:pt-24">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-white/80 px-3.5 py-2 text-xs font-semibold text-teal-800 shadow-sm">
                <Activity size={15} />
                Deep learning research platform
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                A clearer view
                <br />
                <span className="text-teal-700">of lung health.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Explore the notebook’s two-stage research pipeline and compare
                its recorded U-Net and DenseNet121 evaluation metrics.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-800 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 hover:bg-teal-900"
                  href="#results"
                >
                  View notebook results
                  <ArrowUpRight size={17} />
                </a>
                <a
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:text-teal-800"
                  href="#technology"
                >
                  How it works
                  <ArrowDown size={16} />
                </a>
              </div>
              <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-slate-500">
                <ShieldCheck className="mt-0.5 shrink-0 text-teal-700" size={16} />
                Historical research results only. Not a diagnostic tool or medical
                device.
              </p>
            </motion.div>

            <motion.div
              className="relative mx-auto w-full max-w-xl"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.65, delay: 0.1 }}
            >
              <div className="absolute -left-7 top-12 size-28 rounded-full bg-teal-200/60 blur-3xl" />
              <div className="absolute -right-4 bottom-10 size-32 rounded-full bg-blue-200/60 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white bg-slate-950 p-3 shadow-2xl shadow-slate-900/15">
                <div className="xray-panel relative flex aspect-[1.14/1] items-center justify-center overflow-hidden rounded-[1.4rem] border border-white/10">
                  <div className="scanline absolute inset-x-0 top-0 h-1/2" />
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="grid size-24 place-items-center rounded-full border border-white/15 bg-white/10 text-teal-100 backdrop-blur">
                      <Stethoscope size={46} strokeWidth={1.35} />
                    </div>
                    <span className="mt-5 text-xs font-semibold uppercase tracking-[0.26em] text-teal-200/80">
                      Notebook research
                    </span>
                    <span className="mt-2 text-xl font-medium text-white">
                      Image → mask → ROI
                    </span>
                  </div>
                  <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-xs text-slate-300 backdrop-blur">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-teal-400" />
                      Two-stage model pipeline
                    </span>
                    <span>U-Net + DenseNet121</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-5 px-5 py-7 sm:grid-cols-3 lg:px-8">
            <PipelineStep number="01" title="Lung segmentation" text="U-Net produces a 256 × 256 lung mask." />
            <PipelineStep number="02" title="ROI extraction" text="The mask isolates the lung region for analysis." />
            <PipelineStep number="03" title="Image classification" text="DenseNet121 classifies the extracted region." />
          </div>
        </section>

        <section id="technology" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
          <SectionHeading
            eyebrow="The research pipeline"
            title="Built around the notebook's two-stage workflow"
            description="The results shown here come from the project notebook's saved evaluation outputs."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="mb-6 grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-800">
                <Activity size={23} />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-800">
                Stage 01
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">U-Net segmentation</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                The notebook trains a grayscale 256 × 256 U-Net and thresholds
                its predicted mask at 0.5 to isolate lung pixels.
              </p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="mb-6 grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-800">
                <HeartPulse size={23} />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-800">
                Stage 02
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">DenseNet121 classification</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                The extracted ROI is resized to 224 × 224 and passed to the
                notebook's binary classifier.
              </p>
            </article>
          </div>
          <div className="mt-12">
            <SectionHeading
              eyebrow="Transfer learning"
              title="DenseNet121 classifier architecture"
              description="The notebook reuses ImageNet-pretrained DenseNet121 as a frozen feature extractor and trains a compact binary classification head on the lung ROI."
            />
            <TransferLearningDiagram />
          </div>
        </section>

        <section id="workflow" className="bg-slate-900 py-20 text-white lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionHeading
              eyebrow="Notebook workflow"
              title="From X-ray preprocessing to classification"
              description="This summarizes the two-stage workflow used for the notebook's model evaluation."
              inverse
            />
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["01", "Preprocess", "Resize and normalize dataset images."],
                ["02", "Segment", "U-Net generates a lung mask at 256 × 256 resolution."],
                ["03", "Extract ROI", "Threshold the mask to isolate lung pixels."],
                ["04", "Classify", "DenseNet121 predicts the binary class."],
              ].map(([number, title, text]) => (
                <div key={number} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <span className="text-xs font-bold tracking-[0.2em] text-teal-300">{number}</span>
                  <h3 className="mt-5 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="results" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
          <SectionHeading
            eyebrow="Notebook evaluation"
            title="Recorded model results"
            description="These saved notebook metrics describe dataset evaluations, not a new prediction for an individual image."
          />

          <section aria-labelledby="comparison-title" className="mt-10">
            <div className="mb-6 flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-800">
                <BarChart3 size={22} />
              </span>
              <div>
                <h3 id="comparison-title" className="text-xl font-semibold tracking-tight">
                  Compare model metrics
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Scores are shown on a 0–100 scale. Compare metrics within each
                  chart; segmentation and classification are different tasks
                  and should not be directly ranked against each other.
                </p>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <MetricComparisonChart
                title="DenseNet121 · Classification"
                description="Held-out classification test metrics"
                color="#0f766e"
                metrics={classificationMetrics}
              />
              <MetricComparisonChart
                title="U-Net · Segmentation"
                description="Recorded test and best-fold metrics"
                color="#1d4ed8"
                metrics={segmentationMetrics}
              />
            </div>
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-800">
                Classification · DenseNet121
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">Held-out test results</h3>
              <p className="mt-1 text-sm text-slate-500">140 images · 70 Normal, 70 Tuberculosis</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <MetricCard label="Accuracy" value="96.43%" />
                <MetricCard label="AUC" value="0.9890" />
                <MetricCard label="TB recall" value="94.29%" />
                <MetricCard label="Specificity" value="98.57%" />
                <MetricCard label="Test loss" value="0.1306" />
                <MetricCard label="TB precision" value="0.99" />
              </div>
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-slate-800">Confusion matrix</h4>
                <ConfusionMatrix
                  rowLabels={["Normal", "Tuberculosis"]}
                  values={[[69, 1], [4, 66]]}
                />
                <p className="mt-2 text-center text-xs text-slate-500">
                  Rows: actual class · Columns: predicted class
                </p>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[360px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs text-slate-500">
                    <tr>
                      <th className="py-2 font-medium">Class</th>
                      <th className="py-2 font-medium">Precision</th>
                      <th className="py-2 font-medium">Recall</th>
                      <th className="py-2 font-medium">F1-score</th>
                      <th className="py-2 text-right font-medium">Support</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr><th className="py-2.5 font-medium">Normal</th><td>0.95</td><td>0.99</td><td>0.97</td><td className="text-right">70</td></tr>
                    <tr><th className="py-2.5 font-medium">Tuberculosis</th><td>0.99</td><td>0.94</td><td>0.96</td><td className="text-right">70</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-800">
                Segmentation · U-Net
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">Held-out test results</h3>
              <p className="mt-1 text-sm text-slate-500">Best cross-validation fold: 2 of 3</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <MetricCard label="Test accuracy" value="96.45%" />
                <MetricCard label="Test Dice coefficient" value="0.8893" />
                <MetricCard label="Manual Dice calculation" value="0.9274" />
                <MetricCard label="Best fold val. accuracy" value="96.23%" />
                <MetricCard label="Best fold val. Dice" value="0.8864" />
                <MetricCard label="Test loss" value="0.0855" />
              </div>
              <div className="mt-7 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                <p className="text-sm font-semibold text-slate-800">Notebook pipeline</p>
                <ol className="mt-3 space-y-3 text-sm text-slate-600">
                  <li className="flex gap-3"><span className="font-bold text-blue-800">01</span><span>Grayscale X-ray and lung mask resized to 256 × 256, normalized to [0, 1].</span></li>
                  <li className="flex gap-3"><span className="font-bold text-blue-800">02</span><span>U-Net predicts a mask; pixels above 0.5 form the lung ROI.</span></li>
                  <li className="flex gap-3"><span className="font-bold text-blue-800">03</span><span>ROI resized to 224 × 224 and passed to the DenseNet121 binary classifier.</span></li>
                </ol>
              </div>
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                <strong>Checkpoint note:</strong> training output identifies U-Net fold 2
                as the best validation fold, while a later inference cell loads fold 3.
                Verify the intended checkpoint before reporting inference results.
              </div>
            </section>
          </div>
          <p className="mt-6 text-xs leading-5 text-slate-500">
            Source: saved outputs in the project notebook. Metrics are reported as
            recorded and have not been independently re-evaluated. This research
            project is not a medical diagnostic tool.
          </p>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
          <div className="flex gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <Stethoscope className="mt-0.5 shrink-0" size={21} />
            <div>
              <h3 className="text-sm font-bold">Research and education only</h3>
              <p className="mt-1 text-sm leading-6 text-amber-900/80">
                This application is not a medical device and does not provide a
                diagnosis. AI results may be incorrect; do not use them to make
                health decisions. Consult a qualified healthcare professional.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span className="font-semibold text-slate-700">thorax.ai · TB research screening</span>
          <span>Educational research prototype · Not for clinical use</span>
        </div>
      </footer>
    </div>
  );
}

function MetricComparisonChart({
  title,
  description,
  color,
  metrics,
}: {
  title: string;
  description: string;
  color: string;
  metrics: { name: string; value: number }[];
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h4 className="font-semibold text-slate-900">{title}</h4>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      <ul className="mt-5 space-y-4" aria-label={`${title} metric chart`}>
        {metrics.map(({ name, value }) => (
          <li key={name}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-slate-600">{name}</span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-800">
                {value.toFixed(2)}%
              </span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label={name}
              aria-valuenow={value}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${value}%`, backgroundColor: color }}
              />
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

function TransferLearningDiagram() {
  const stages = [
    {
      number: "01",
      title: "Lung ROI",
      detail: "224 × 224 × 3 input",
      group: "Input",
      color: "border-slate-200 bg-slate-50 text-slate-700",
    },
    {
      number: "02",
      title: "DenseNet121",
      detail: "ImageNet weights · frozen",
      group: "Feature extractor",
      color: "border-blue-200 bg-blue-50 text-blue-900",
    },
    {
      number: "03",
      title: "Global average pooling",
      detail: "Compress feature maps",
      group: "Classification head",
      color: "border-teal-200 bg-teal-50 text-teal-900",
    },
    {
      number: "04",
      title: "Dense layer",
      detail: "128 units · ReLU",
      group: "Classification head",
      color: "border-teal-200 bg-teal-50 text-teal-900",
    },
    {
      number: "05",
      title: "Dropout",
      detail: "Rate 0.3",
      group: "Regularization",
      color: "border-violet-200 bg-violet-50 text-violet-900",
    },
    {
      number: "06",
      title: "Binary output",
      detail: "1 unit · sigmoid",
      group: "Output",
      color: "border-amber-200 bg-amber-50 text-amber-900",
    },
  ];

  return (
    <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {stages.map((stage, index) => (
          <div key={stage.number} className="relative">
            <article
              className={`flex h-full min-h-32 flex-col rounded-2xl border p-4 ${stage.color}`}
            >
              <span className="text-[10px] font-bold tracking-[0.18em] opacity-70">
                STEP {stage.number}
              </span>
              <h4 className="mt-3 text-sm font-semibold">{stage.title}</h4>
              <p className="mt-1 text-xs leading-5 opacity-80">{stage.detail}</p>
              <span className="mt-auto pt-3 text-[10px] font-semibold uppercase tracking-wide opacity-60">
                {stage.group}
              </span>
            </article>
            {index < stages.length - 1 && (
              <ArrowRight
                className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-slate-400 lg:block"
                size={18}
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 text-sm sm:grid-cols-2">
        <p className="rounded-xl bg-blue-50 px-4 py-3 leading-6 text-blue-950">
          <strong>Frozen backbone:</strong> DenseNet121 convolutional layers use
          ImageNet weights and remain non-trainable.
        </p>
        <p className="rounded-xl bg-teal-50 px-4 py-3 leading-6 text-teal-950">
          <strong>Trained head:</strong> The added pooling and dense layers learn
          to classify the ROI as Normal or Tuberculosis.
        </p>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        Notebook training configuration: Adam optimizer (learning rate 0.001),
        binary cross-entropy loss, and early stopping on validation loss.
      </p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function ConfusionMatrix({
  rowLabels,
  values,
}: {
  rowLabels: [string, string];
  values: [[number, number], [number, number]];
}) {
  return (
    <div className="mt-3 grid grid-cols-[minmax(90px,1fr)_repeat(2,minmax(60px,0.7fr))] gap-1 text-center text-sm">
      <span className="p-2 text-xs text-slate-500">Actual ↓ / Predicted →</span>
      <span className="p-2 text-xs font-medium text-slate-600">Normal</span>
      <span className="p-2 text-xs font-medium text-slate-600">TB</span>
      {rowLabels.map((label, row) => (
        <div key={label} className="contents">
          <span className="flex items-center p-2 text-left text-xs font-medium text-slate-600">
            {label}
          </span>
          {values[row].map((value, column) => (
            <span
              key={`${row}-${column}`}
              className={`rounded-lg p-3 text-lg font-semibold ${
                row === column
                  ? "bg-teal-100 text-teal-900"
                  : "bg-amber-50 text-amber-900"
              }`}
            >
              {value}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function PipelineStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="flex gap-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-teal-50 text-xs font-bold text-teal-800">
        {number}
      </span>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  inverse = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  inverse?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <p className={`text-xs font-bold uppercase tracking-[0.2em] ${inverse ? "text-teal-300" : "text-teal-800"}`}>
        {eyebrow}
      </p>
      <h2 className={`mt-3 text-3xl font-semibold tracking-tight sm:text-4xl ${inverse ? "text-white" : "text-slate-950"}`}>
        {title}
      </h2>
      <p className={`mt-4 text-sm leading-6 sm:text-base ${inverse ? "text-slate-400" : "text-slate-600"}`}>
        {description}
      </p>
    </div>
  );
}

export default App;
