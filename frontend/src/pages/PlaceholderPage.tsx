import { ApplicationShell } from "../components/layout/ApplicationShell";
import { Card } from "../components/common/Card";

interface PlaceholderPageProperties {
  title: string;
  message: string;
}

export function PlaceholderPage({ title, message }: PlaceholderPageProperties) {
  return (
    <ApplicationShell title={title}>
      <Card border>
        <p className="text-sm text-navy-600">{message}</p>
      </Card>
    </ApplicationShell>
  );
}
