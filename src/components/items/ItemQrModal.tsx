'use client';

import { useRouter } from 'next/navigation';
import { Download, Printer } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { QrCode } from './QrCode';
import { itemQrUrl } from '@/lib/item-code';
import { qrPngDataUrl } from '@/lib/qr';
import type { Item } from '@/types';

/**
 * One item's QR: view it or download it. Printing opens the label printer
 * screen with this item already ticked, so stock, size and printer settings
 * live in one place.
 */
export function ItemQrModal({ item, onClose }: { item: Item; onClose: () => void }) {
  const router = useRouter();
  const code = item.itemCode ?? '';
  const url = itemQrUrl(code);

  const download = () => {
    const link = document.createElement('a');
    link.href = qrPngDataUrl(url);
    link.download = `${code || 'item'}-qr.png`;
    link.click();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Item QR Code"
      width="sm"
      footer={
        <>
          <Button variant="secondary" icon={<Download size={15} />} onClick={download}>
            Download
          </Button>
          <Button
            icon={<Printer size={15} />}
            onClick={() => router.push(`/utilities/barcode?item=${item.id}`)}
          >
            Print Labels…
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="rounded-xl border border-line bg-white p-2">
          <QrCode value={url} size={220} />
        </div>
        <p className="mt-3 text-[15px] font-semibold text-ink">{item.name}</p>
        <p className="font-mono text-[13px] text-ink-soft">{code}</p>
        <p className="mt-1 max-w-full break-all text-[11.5px] text-ink-faint">{url}</p>
      </div>
    </Modal>
  );
}
