import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config';
import { IssueReportInputDto, IssueReportOutputDto } from '@lambda/issue-report/issue-report.dto'
import { S3Service } from '@lambda/aws/s3.service';
import { randomUUID } from 'crypto';
import Mustache from 'mustache';
import { EventBridgeService } from '@lambda/aws/eventbridge';

const REPORT_TEMPLATE = `<!DOCTYPE html>
<html lang="es">

<head>
    <!-- Google Tag Manager -->
    <script>(function (w, d, s, l, i) {
            w[l] = w[l] || []; w[l].push({
                'gtm.start':
                    new Date().getTime(), event: 'gtm.js'
            }); var f = d.getElementsByTagName(s)[0],
                j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : ''; j.async = true; j.src =
                    'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
        })(window, document, 'script', 'dataLayer', 'GTM-M77B8PV6');</script>
    <!-- End Google Tag Manager -->
    <title>Reporte de Análisis de Seguridad Titvo</title>
    <link href="https://cdn.prod.website-files.com/603dfe33e1a2669e0384eaf6/6048231170ce0ffdf1650015_fav-icon.png"
        rel="shortcut icon" type="image/x-icon">
    <style>
        :root {
            --titvo-primary: #1a73e8;
            --titvo-secondary: #4285f4;
            --titvo-accent: #34a853;
            --titvo-danger: #ea4335;
            --titvo-warning: #fbbc05;
            --titvo-success: #34a853;
            --titvo-light: #f8f9fa;
            --titvo-dark: #202124;
        }

        body {
            font-family: 'Google Sans', Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
            color: var(--titvo-dark);
            background-color: #ffffff;
        }

        .header {
            background-color: var(--titvo-light);
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .header h1 {
            color: var(--titvo-primary);
            margin: 0;
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .header h1 img {
            height: 50px;
        }

        .issue {
            border: 1px solid #e8eaed;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s ease;
        }

        .issue:hover {
            transform: translateY(-2px);
        }

        .critical {
            border-left: 5px solid var(--titvo-danger);
        }

        .high {
            border-left: 5px solid var(--titvo-warning);
        }

        .medium {
            border-left: 5px solid var(--titvo-secondary);
        }

        .low {
            border-left: 5px solid var(--titvo-success);
        }

        .summary {
            background-color: var(--titvo-light);
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .summary h2 {
            color: var(--titvo-primary);
            margin-top: 0;
        }

        .summary p {
            margin: 10px 0;
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e8eaed;
        }

        .summary p:last-child {
            border-bottom: none;
        }

        h2 {
            color: var(--titvo-primary);
            margin-top: 30px;
        }

        .issue h3 {
            color: var(--titvo-primary);
            margin-top: 0;
        }

        code {
            background-color: var(--titvo-light);
            padding: 4px 8px;
            border-radius: 4px;
            font-family: 'Consolas', monospace;
            display: block;
            margin: 10px 0;
            white-space: pre;
            overflow-x: auto;
        }

        strong {
            color: var(--titvo-dark);
        }

        .severity-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9em;
            font-weight: 500;
            margin: 5px 0;
        }

        .severity-critical {
            background-color: #fce8e6;
            color: var(--titvo-danger);
        }

        .severity-high {
            background-color: #fef7e0;
            color: var(--titvo-warning);
        }

        .severity-medium {
            background-color: #e8f0fe;
            color: var(--titvo-secondary);
        }

        .severity-low {
            background-color: #e6f4ea;
            color: var(--titvo-success);
        }

        .feedback-buttons {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 15px;
        }

        .feedback-btn {
            padding: 6px 12px;
            border-radius: 4px;
            border: none;
            font-weight: 500;
            font-size: 0.9em;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-correct {
            background-color: var(--titvo-success);
            color: white;
        }

        .btn-incorrect {
            background-color: var(--titvo-danger);
            color: white;
        }

        .feedback-btn:hover {
            opacity: 0.9;
            transform: translateY(-2px);
        }

        .feedback-btn:active {
            transform: translateY(0);
        }

        .feedback-selected {
            box-shadow: 0 0 0 2px #fff, 0 0 0 4px currentColor;
        }

        .feedback-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .feedback-btn:disabled.feedback-selected {
            opacity: 0.8;
        }

        .toast {
            visibility: hidden;
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background-color: var(--titvo-dark);
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            z-index: 999;
            font-size: 0.9em;
            opacity: 0;
            transition: opacity 0.3s, visibility 0.3s;
        }

        .toast.show {
            visibility: visible;
            opacity: 1;
        }
    </style>
</head>

<body>
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M77B8PV6" height="0" width="0"
            style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->
    <div class="header">
        <h1>
            <img src="https://cdn.prod.website-files.com/603dfe33e1a2669e0384eaf6/6048081cbb0b106db5539f7e_Titvologo.png"
                alt="Logo Titvo">
        </h1>
        <h1>Reporte de Análisis de Seguridad</h1>
        <p>Fecha de Análisis: {{scan_date}}</p>
    </div>

    <div class="summary">
        <h2>Resumen</h2>
        <p>Total de Problemas: <span>{{total_issues}}</span></p>
        <p>Problemas Críticos: <span>{{critical_issues}}</span></p>
        <p>Problemas Altos: <span>{{high_issues}}</span></p>
        <p>Problemas Medios: <span>{{medium_issues}}</span></p>
        <p>Problemas Bajos: <span>{{low_issues}}</span></p>
    </div>

    <h2>Problemas Detectados</h2>
    {{#issues}}
    <div class="issue {{severity_lower}}">
        <h3>{{title}}</h3>
        <div class="severity-badge severity-{{severity_lower}}">
            {{severity_label}}
        </div>
        <p><strong>Archivo:</strong> {{path}}</p>
        <p><strong>Línea:</strong> {{line}}</p>
        <p><strong>Código:</strong></p>
        <code>{{code}}</code>
        <p><strong>Descripción:</strong></p>
        <p>{{description}}</p>
        <p><strong>Recomendación:</strong></p>
        <p>{{recommendation}}</p>
        {{#summary}}
        <p><strong>Resumen:</strong></p>
        <p>{{summary}}</p>
        {{/summary}}

        <div class="feedback-buttons">
            <span><strong>¿Es correcto?</strong></span>
            <button class="feedback-btn btn-correct" onclick="provideFeedback(this, '{{index}}', true)">
                ✓ Sí
            </button>
            <button class="feedback-btn btn-incorrect" onclick="provideFeedback(this, '{{index}}', false)">
                ✗ No
            </button>
        </div>
    </div>
    {{/issues}}

    <div id="toast" class="toast"></div>

    <script>
        function provideFeedback(button, issueId, isCorrect) {
            const parentButtons = button.parentElement.querySelectorAll('.feedback-btn');
            parentButtons.forEach(btn => {
                btn.classList.remove('feedback-selected');
                btn.disabled = true;
            });
            button.classList.add('feedback-selected');
            sendIssueFeedback(issueId, isCorrect);
            showToast(\`Feedback enviado para el issue #\${issueId}\`);
        }

        function sendIssueFeedback(issueId, isCorrect) {
            console.log(\`Issue #\${issueId} marcado como \${isCorrect ? 'correcto' : 'incorrecto'}\`);
            return true;
        }

        function showToast(message, duration = 3000) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, duration);
        }
    </script>
</body>

</html>`;

@Injectable()
export class IssueReportService {
  private readonly logger = new Logger(IssueReportService.name)
  constructor (
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
    private readonly eventBridgeService: EventBridgeService,
  ) {}
  async process (input: IssueReportInputDto): Promise<IssueReportOutputDto> {
    const bucketName = this.configService.get<string>('titvoReportBucketName') as string;
    const websiteUrl = this.configService.get<string>('titvoReportBucketWebsiteUrl') as string;
    this.logger.debug(`Uploading report to bucket ${bucketName} with website URL ${websiteUrl}`);
    const key = `reports/${randomUUID()}.html`;
    const renderedHtml = Mustache.render(REPORT_TEMPLATE, this.prepareTemplateData(input.data));
    await this.s3Service.uploadFile(bucketName, 'text/html; charset=utf-8', Buffer.from(renderedHtml), key);
    this.logger.debug(`Report uploaded to bucket ${bucketName} with website URL ${websiteUrl}/${key}`);
    await this.eventBridgeService.putEvents([{
      Source: 'mcp.tool.issue.report',
      DetailType: 'output',
      Detail: JSON.stringify({
        taskId: input.taskId,
        reportURL: `${websiteUrl}/${key}`
      }),
      EventBusName: this.configService.get<string>('titvoEventBusName') as string
    }]);
    this.logger.debug(`EventBridge event sent for task ${input.taskId}`);
    return {
      taskId: input.taskId,
      success: true,
      message: 'Report uploaded successfully',
      data: {
        reportURL: `${websiteUrl}/${key}`
      }
    }
  }

  private prepareTemplateData(data: IssueReportInputDto['data']) {
    const annotations = data.annotations || [];
    
    // Calcular contadores por severidad
    const severityCounts = annotations.reduce((acc, issue) => {
      const severity = issue.severity.toUpperCase();
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Mapear issues agregando campos necesarios para Mustache
    const issues = annotations.map((issue, index) => ({
      ...issue,
      index: index + 1,
      severity_lower: issue.severity.toLowerCase(),
      severity_label: this.getSeverityLabel(issue.severity)
    }));

    return {
      scan_date: new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      total_issues: annotations.length,
      critical_issues: severityCounts['CRITICAL'] || 0,
      high_issues: severityCounts['HIGH'] || 0,
      medium_issues: severityCounts['MEDIUM'] || 0,
      low_issues: severityCounts['LOW'] || 0,
      issues
    };
  }

  private getSeverityLabel(severity: string): string {
    const labels: Record<string, string> = {
      'CRITICAL': 'Crítico',
      'HIGH': 'Alto',
      'MEDIUM': 'Medio',
      'LOW': 'Bajo'
    };
    return labels[severity.toUpperCase()] || severity;
  }
}
