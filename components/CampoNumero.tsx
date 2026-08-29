"use client";

interface CampoNumeroProps {
  id: string;
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  unidade?: string;
  dica?: string;
  placeholder?: string;
  destaque?: boolean;
}

export default function CampoNumero({
  id,
  rotulo,
  valor,
  onChange,
  unidade,
  dica,
  placeholder,
  destaque = false,
}: CampoNumeroProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
        {rotulo}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={valor}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          className={`w-full rounded-lg border bg-white px-3 py-2 text-sm tabular-nums outline-none transition focus:border-agua-500 focus:ring-2 focus:ring-agua-100 ${
            destaque ? "border-agua-300 bg-agua-50/40" : "border-slate-300"
          } ${unidade ? "pr-12" : ""}`}
        />
        {unidade && (
          <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs font-medium text-slate-400">
            {unidade}
          </span>
        )}
      </div>
      {dica && <p className="mt-1 text-[11px] leading-snug text-slate-500">{dica}</p>}
    </div>
  );
}
