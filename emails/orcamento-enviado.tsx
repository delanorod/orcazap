// emails/orcamento-enviado.tsx
import {
  Html, Head, Preview, Body, Container,
  Heading, Text, Button, Hr,
} from "@react-email/components";

type Props = {
  nomeCliente: string;
  nomeTecnico: string;
  numero: number | string;
  totalFormatado: string;
  urlPublica: string;
  validade?: string;
};

export default function OrcamentoEnviado({
  nomeCliente, nomeTecnico, numero, totalFormatado, urlPublica, validade,
}: Props) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Orçamento nº {String(numero)} no valor de {totalFormatado}</Preview>
      <Body style={{ backgroundColor: "#f6f7f9", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#fff", padding: 24, borderRadius: 8, maxWidth: 520 }}>
          <Heading as="h2">Olá, {nomeCliente}!</Heading>
          <Text>
            {nomeTecnico} preparou o orçamento nº {numero} para você, no valor de{" "}
            <strong>{totalFormatado}</strong>.
          </Text>
          {validade && <Text>Válido até {validade}.</Text>}
          <Button
            href={urlPublica}
            style={{ backgroundColor: "#16a34a", color: "#fff", padding: "12px 20px", borderRadius: 6 }}
          >
            Ver e responder orçamento
          </Button>
          <Hr />
          <Text style={{ fontSize: 12, color: "#666" }}>
            Enviado via OrçaZap em nome de {nomeTecnico}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Dados de exemplo para o preview local
OrcamentoEnviado.PreviewProps = {
  nomeCliente: "Maria",
  nomeTecnico: "João Informática",
  numero: 42,
  totalFormatado: "R$ 350,00",
  urlPublica: "http://localhost:3000/q/abc123",
  validade: "10/11/2026",
} satisfies Props;