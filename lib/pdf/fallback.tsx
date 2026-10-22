import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { brl, dateBR } from "@/lib/format";
import type { QuotePdfData } from "./types";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  header: { borderBottom: "2pt solid #111", paddingBottom: 10, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "bold" },
  muted: { color: "#555" },
  row: { flexDirection: "row", borderBottom: "1pt solid #ddd", paddingVertical: 6 },
  head: { flexDirection: "row", backgroundColor: "#f1f1f1", paddingVertical: 6 },
  cDesc: { flex: 1, paddingHorizontal: 4 },
  cNum: { width: 70, textAlign: "right", paddingHorizontal: 4 },
  totals: { marginTop: 14, alignSelf: "flex-end", width: 200 },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  total: { fontSize: 14, fontWeight: "bold", borderTop: "2pt solid #111", marginTop: 4, paddingTop: 4 },
});

function QuoteDocument({ d }: { d: QuotePdfData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>{d.businessName}</Text>
          {d.businessPhone ? <Text style={s.muted}>{d.businessPhone}</Text> : null}
          <Text style={s.muted}>
            Orçamento emitido em {dateBR(d.createdAt)} · válido até {dateBR(d.validUntil)}
          </Text>
        </View>

        <Text>Cliente: {d.clientName}</Text>

        <View style={[s.head, { marginTop: 12 }]}>
          <Text style={s.cDesc}>Descrição</Text>
          <Text style={s.cNum}>Qtd</Text>
          <Text style={s.cNum}>Unitário</Text>
          <Text style={s.cNum}>Total</Text>
        </View>
        {d.items.map((i, idx) => (
          <View key={idx} style={s.row} wrap={false}>
            <Text style={s.cDesc}>{i.description}</Text>
            <Text style={s.cNum}>{i.quantity}</Text>
            <Text style={s.cNum}>{brl(i.unitPrice)}</Text>
            <Text style={s.cNum}>{brl(i.lineTotal)}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.line}><Text>Subtotal</Text><Text>{brl(d.subtotal)}</Text></View>
          {d.discountPercent > 0 && (
            <View style={s.line}>
              <Text>Desconto ({d.discountPercent}%)</Text>
              <Text>- {brl(d.subtotal - d.total)}</Text>
            </View>
          )}
          <View style={[s.line, s.total]}><Text>Total</Text><Text>{brl(d.total)}</Text></View>
        </View>

        {d.notes ? <Text style={{ marginTop: 20 }}>Observações: {d.notes}</Text> : null}
      </Page>
    </Document>
  );
}

export async function renderFallbackPdf(d: QuotePdfData): Promise<Uint8Array> {
  return await renderToBuffer(<QuoteDocument d={d} />);
}