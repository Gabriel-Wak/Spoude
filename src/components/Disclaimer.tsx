"use client";

import { ShieldCheck } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useLocalStore } from "@/lib/client";
import { disclaimerStore } from "@/lib/state";

const noop = () => () => {};

export const DISCLAIMER_SHORT =
  "Ferramenta de apoio acadêmico. Não é dispositivo médico e não substitui o julgamento clínico nem a preceptoria.";

export function DisclaimerModal() {
  const [accepted, setAccepted] = useLocalStore(disclaimerStore);
  // Evita piscar o modal no SSR para quem já aceitou.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted || accepted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-2xl">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-slate-900">
          Bem-vindo ao Spoude
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          O Spoude é uma plataforma de <strong>suporte acadêmico, educacional e de revisão de literatura</strong> para
          estudantes de medicina, residentes e médicos.
        </p>
        <ul className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
          <li>• Não constitui dispositivo médico (<em>Software as a Medical Device</em> — SaMD).</li>
          <li>• Não realiza prescrições, diagnóstico clínico ou suporte à decisão terapêutica para pacientes reais.</li>
          <li>
            • Não substitui o julgamento técnico, a validação e a responsabilidade ético-profissional de médicos
            habilitados e da preceptoria.
          </li>
          <li>• Respostas geradas por IA podem conter erros: sempre confira nas fontes originais e diretrizes vigentes.</li>
        </ul>
        <button
          onClick={() => setAccepted(true)}
          className="mt-6 w-full rounded-xl bg-brand-700 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
        >
          Entendi e concordo
        </button>
      </div>
    </div>
  );
}
