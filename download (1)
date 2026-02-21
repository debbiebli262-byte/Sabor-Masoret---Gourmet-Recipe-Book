
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportRecipeToPdf(elementId: string, title: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Element not found for PDF export:", elementId);
    return;
  }

  try {
    const DocConstructor = (jsPDF as any).jsPDF || jsPDF;
    // Standard A4: 210mm x 297mm
    const pdf = new DocConstructor('p', 'mm', 'a4');
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Use a high scale for quality, but ensure we capture the whole scroll area
    const canvas = await html2canvas(element, {
      scale: 3, 
      useCORS: true,
      backgroundColor: '#FFFFFF',
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      y: 0,
      x: 0
    });
    
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // Margin for the PDF
    const margin = 10;
    const maxPdfWidth = pageWidth - (margin * 2);
    const maxPdfHeight = pageHeight - (margin * 2);
    
    let imgWidth = maxPdfWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Check if height exceeds A4. If so, scale down everything proportionally to fit on ONE PAGE.
    if (imgHeight > maxPdfHeight) {
      const ratio = maxPdfHeight / imgHeight;
      imgHeight = maxPdfHeight;
      imgWidth = imgWidth * ratio;
    }

    // Centering the recipe on the A4 page horizontally
    const xOffset = margin + (maxPdfWidth - imgWidth) / 2;
    const yOffset = margin;

    // Cover page logic removed per user request. Direct to recipe.
    pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
    
    pdf.save(`${title.replace(/\s+/g, '_')}_ChefBook.pdf`);
  } catch (error) {
    console.error("PDF Export failed:", error);
  }
}
