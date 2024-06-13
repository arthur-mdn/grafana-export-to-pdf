# Grafana PDF Exporter

This project allows exporting Grafana dashboards to PDF using Puppeteer. The project uses a Node.js server to handle HTTP requests and launch Puppeteer to generate the PDFs.

It is possible to inject a button into Grafana to generate a PDF directly from the interface.

![Button displayed in Grafana](https://github.com/arthur-mdn/grafana-export-to-pdf/blob/main/illustrations/injected-button-in-grafana.png)

## Prerequisites

- Docker
- Docker Compose

## Installation

Clone this repository and navigate to the project directory:

```shell
git clone https://github.com/arthur-mdn/grafana-export-to-pdf/
cd grafana-export-to-pdf
```

## Configuration

### Environment Variables
Duplicate the `.env.example` file and rename it to `.env`. 

```shell
cp .env.template .env
nano .env
```

Modify the values according to your configuration.

```dotenv
GRAFANA_USER=pdf_export
GRAFANA_PASSWORD=pdf_export
```

## Usage
To start the project, run the following command:

```shell
docker compose up -d --build
```
The server will be accessible on port 3000.

### Generating a PDF
To generate a PDF, send a POST request to the /generate-pdf API with the Grafana dashboard URL as a parameter.
The server will respond with the URL of the generated PDF.

#### Using cURL
```bash
curl \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{ "url": "http://your-grafana-server/d/your-dashboard-id?orgId=1&kiosk"}' \
  http://localhost:3000/generate-pdf
```

#### Using the `generate-pdf.sh` shell script
```bash
docker compose exec server /usr/src/app/generate-pdf.sh GF_DASH_URL 'http://your-grafana-server/d/your-dashboard-id?orgId=1&kiosk'
```

#### Using an HTML button injected into Grafana
> You must ensure that the ``disable_sanitize_html`` parameter is set to ``true`` in the Grafana configuration file to be able to inject HTML and Javascript code.

![How to inject the button in Grafana](https://github.com/arthur-mdn/grafana-export-to-pdf/blob/main/illustrations/inject-button-in-grafana.png)

To inject a button directly into Grafana, add the content of the `grafana-button.html` file to the "Text" field of a Grafana text panel.
Make sure to modify the server URL if necessary.

```javascript
const pdfGeneration = true;
const pdfGenerationServerUrl = 'http://localhost:3000/';
```

### Generating a PDF with a time range

To generate a PDF with a time range, send a POST request to the /generate-pdf API with the Grafana dashboard URL as a parameter and the from and to parameters.

> In the example below, the time range is ``now-1y/y``, which corresponds to last year.

> See more details on time ranges in the [Grafana documentation](https://grafana.com/docs/grafana/latest/dashboards/use-dashboards/#time-units-and-relative-ranges).

#### Using cURL
```bash
curl \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{ "url": "http://your-grafana-server/d/your-dashboard-id?orgId=1&kiosk", "from": "now-1y/y", "to": "now-1y/y"}' \
  http://localhost:3000/generate-pdf
```

#### Using the `generate-pdf.sh` shell script
```bash
docker compose exec server /usr/src/app/generate-pdf.sh GF_DASH_URL 'http://your-grafana-server/d/your-dashboard-id?orgId=1&kiosk' GF_FROM 'now-1y/y' GF_TO 'now-1y/y'
```

#### Using an HTML button injected into Grafana
The injected HTML button already retrieves the values of the selected time range in Grafana. You do not need to specify them manually.

# Author

- [Arthur M.](https://mondon.pro)
