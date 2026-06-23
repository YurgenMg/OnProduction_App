import docx

def read_full_docx():
    doc_path = r"c:\Users\USUARIO\Documents\Aplicaciones\OnProduction\documento_requerimiento\requerimientos.docx"
    doc = docx.Document(doc_path)
    
    with open("documento_requerimiento/requerimientos_leidos.txt", "w", encoding="utf-8") as f:
        f.write("=== ESTRUCTURA COMPLETA DEL DOCUMENTO ===\n\n")
        
        # Leer todos los elementos en orden (párrafos y tablas)
        for element in doc.element.body:
            if element.tag.endswith('p'):
                p = docx.text.paragraph.Paragraph(element, doc)
                if p.text.strip():
                    f.write(f"P: {p.text}\n")
            elif element.tag.endswith('tbl'):
                t = docx.table.Table(element, doc)
                f.write("\n--- TABLA ---\n")
                for r in t.rows:
                    row_data = [cell.text.replace("\n", " ").strip() for cell in r.cells]
                    # Quitar celdas repetidas por merge
                    unique_row_data = []
                    for val in row_data:
                        if not unique_row_data or unique_row_data[-1] != val:
                            unique_row_data.append(val)
                    f.write(" | ".join(unique_row_data) + "\n")
                f.write("-------------\n\n")

if __name__ == "__main__":
    read_full_docx()
    print("Documento extraído con éxito en documento_requerimiento/requerimientos_leidos.txt")
