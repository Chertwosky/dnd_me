import Link from "next/link";
import type { ChangeEvent, ReactNode } from "react";

import { Badge, LinkButton } from "@/components/ui";

export function RoomHeader({
  roomId,
  title,
  description,
  inviteCopied,
  saveLabel,
  canManageFiles,
  onCopyInviteLink,
  onUploadMap,
  onImportMapJson,
  onExportMapJson,
}: {
  roomId: string;
  title: string;
  description: string;
  inviteCopied: boolean;
  saveLabel: ReactNode;
  canManageFiles: boolean;
  onCopyInviteLink: () => void;
  onUploadMap: (event: ChangeEvent<HTMLInputElement>) => void;
  onImportMapJson: (event: ChangeEvent<HTMLInputElement>) => void;
  onExportMapJson: () => void;
}) {
  return (
    <header className="arcane-panel overflow-hidden px-5 py-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <Badge tone="arcane">Комната / {roomId}</Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-parchment-100 md:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/">
            <LinkButton className="px-4 py-2">На главную</LinkButton>
          </Link>
          <button type="button" onClick={onCopyInviteLink} className="arcane-button arcane-button-secondary px-4 py-2">
            {inviteCopied ? "Ссылка скопирована" : "Копировать invite"}
          </button>
          <span className="arcane-button bg-white/5 px-4 py-2 text-xs">Сохранение: {saveLabel}</span>
          {canManageFiles ? (
            <>
              <label className="arcane-button cursor-pointer bg-white/5 px-4 py-2">
                Загрузить карту
                <input type="file" accept="image/*" className="hidden" onChange={onUploadMap} />
              </label>
              <label className="arcane-button cursor-pointer bg-white/5 px-4 py-2">
                Загрузить JSON
                <input type="file" accept="application/json" className="hidden" onChange={onImportMapJson} />
              </label>
              <button type="button" onClick={onExportMapJson} className="arcane-button arcane-button-primary px-4 py-2">
                Сохранить JSON
              </button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}

