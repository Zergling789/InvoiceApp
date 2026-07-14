FROM node:24.16.0-bookworm-slim AS tools

ARG MUSTANG_URL=https://github.com/ZUGFeRD/mustangproject/releases/download/core-2.24.0/Mustang-CLI-2.24.0.jar
ARG MUSTANG_SHA256=e4904ffa0afdce3f5836dceb927c440a05ed5d60386fdd37e17a4b2f7652edbf
ARG KOSIT_URL=https://github.com/itplr-kosit/validator/releases/download/v1.6.2/validator-1.6.2-standalone.jar
ARG KOSIT_SHA256=244978514ad48f67c7573acfffc8f4fd73d81feda6f276710033f9913579857e
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
  && mkdir -p /opt/einvoice \
  && curl --fail --location --silent --show-error "$MUSTANG_URL" --output /opt/einvoice/Mustang-CLI-2.24.0.jar \
  && echo "$MUSTANG_SHA256  /opt/einvoice/Mustang-CLI-2.24.0.jar" | sha256sum --check --strict \
  && curl --fail --location --silent --show-error "$KOSIT_URL" --output /opt/einvoice/validator-1.6.2-standalone.jar \
  && echo "$KOSIT_SHA256  /opt/einvoice/validator-1.6.2-standalone.jar" | sha256sum --check --strict

FROM node:24.16.0-bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends openjdk-17-jre-headless ghostscript icc-profiles-free \
  && rm -rf /var/lib/apt/lists/* \
  && java -version 2>&1 | grep '17\.' \
  && gs --version | grep '^10\.'
COPY --from=tools /opt/einvoice /opt/einvoice
COPY --chown=node:node services/einvoice-generator /app
RUN mkdir -p /tmp/einvoice && chown node:node /tmp/einvoice
USER node
WORKDIR /app
ENV NODE_ENV=production PORT=8080 MUSTANG_JAR=/opt/einvoice/Mustang-CLI-2.24.0.jar ICC_PROFILE=/usr/share/color/icc/ghostscript/srgb.icc GENERATOR_TEMP_ROOT=/tmp/einvoice
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
