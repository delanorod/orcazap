// emails/orcamento-evento.tsx
import { Html, Head, Preview, Body, Container, Heading, Text, Button } from "@react-email/components";

type Props = { titulo: string; mensagem: string; url: string };

export default function OrcamentoEvento({ titulo, mensagem, url }: Props) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{mensagem}</Preview>
      <Body style={{ backgroundColor: "#f6f7f9", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#fff", padding: 24, borderRadius: 8, maxWidth: 520 }}>
          <Heading as="h2">{titulo}</Heading>
          <Text>{mensagem}</Text>
          <Button
            href={url}
            style={{ backgroundColor: "#16a34a", color: "#fff", padding: "12px 20px", borderRadius: 6 }}
          >
            Abrir orçamento
          </Button>
        </Container>
      </Body>
    </Html>
  );
}

OrcamentoEvento.PreviewProps = {
  titulo: "Orçamento aceito",
  mensagem: "Maria aceitou o orçamento 3F9A1C2B",
  url: "http://localhost:3000/orcamentos/abc",
} satisfies Props;