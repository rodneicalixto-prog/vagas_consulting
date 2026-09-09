"use client";

const ETAPAS = [
  { status: "recebida", label: "Recebida" },
  { status: "triagem", label: "Triagem" },
  { status: "entrevista", label: "Entrevista" },
  { status: "proposta", label: "Proposta" },
  { status: "contratado", label: "Contratado" },
];

export function StatusSelect({
  applicationId,
  jobId,
  currentStatus,
  action,
}: {
  applicationId: string;
  jobId: string;
  currentStatus: string;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="mt-1.5">
      <input type="hidden" name="application_id" value={applicationId} />
      <input type="hidden" name="job_id" value={jobId} />
      <select
        name="status"
        defaultValue={currentStatus}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="w-full rounded border border-border bg-bg px-1.5 py-1 text-[10.5px]"
      >
        {ETAPAS.map((et) => (
          <option key={et.status} value={et.status}>
            {et.label}
          </option>
        ))}
        <option value="rejeitada">Rejeitar</option>
        <option value="desistente">Desistência</option>
      </select>
    </form>
  );
}
