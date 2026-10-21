export async function exportElementAsPdf(element: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const canvas = await html2canvas(element, {
    backgroundColor: '#f8f7fa',
    scale: 1.5,
    useCORS: true,
    logging: false,
    onclone: documentClone => {
      documentClone.querySelectorAll<HTMLElement>('[data-hide-from-pdf]').forEach(node => {
        node.style.display = 'none';
      });
    },
  });

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const margin = 24;
  const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
  const imageWidth = pageWidth;
  const imageHeight = (canvas.height * imageWidth) / canvas.width;
  const image = canvas.toDataURL('image/png');

  let remaining = imageHeight;
  let offset = 0;
  while (remaining > 0) {
    if (offset > 0) pdf.addPage();
    pdf.addImage(image, 'PNG', margin, margin - offset, imageWidth, imageHeight, undefined, 'FAST');
    remaining -= pageHeight;
    offset += pageHeight;
  }
  pdf.save(filename);
}
