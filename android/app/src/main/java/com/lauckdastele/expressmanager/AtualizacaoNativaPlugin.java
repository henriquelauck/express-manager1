package com.lauckdastele.expressmanager;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AtualizacaoNativa")
public class AtualizacaoNativaPlugin extends Plugin {

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void obterVersaoInstalada(PluginCall call) {
        try {
            PackageManager packageManager = getContext().getPackageManager();
            PackageInfo packageInfo = packageManager.getPackageInfo(
                    getContext().getPackageName(),
                    0
            );

            long versionCode;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                versionCode = packageInfo.getLongVersionCode();
            } else {
                versionCode = packageInfo.versionCode;
            }

            JSObject resposta = new JSObject();
            resposta.put("versionCode", versionCode);
            resposta.put("versionName", packageInfo.versionName);
            resposta.put("packageName", getContext().getPackageName());

            call.resolve(resposta);
        } catch (Exception erro) {
            call.reject(
                    "Não foi possível identificar a versão instalada.",
                    erro
            );
        }
    }

    @PluginMethod
    public void verificarPermissaoInstalacao(PluginCall call) {
        try {
            boolean permitido =
                    Build.VERSION.SDK_INT < Build.VERSION_CODES.O
                            || getContext()
                            .getPackageManager()
                            .canRequestPackageInstalls();

            JSObject resposta = new JSObject();
            resposta.put("permitido", permitido);
            resposta.put(
                    "precisaAbrirConfiguracoes",
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                            && !permitido
            );

            call.resolve(resposta);
        } catch (Exception erro) {
            call.reject(
                    "Não foi possível verificar a permissão de instalação.",
                    erro
            );
        }
    }

    @PluginMethod
    public void abrirPermissaoInstalacao(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            JSObject resposta = new JSObject();
            resposta.put("aberto", false);
            resposta.put("permitido", true);
            call.resolve(resposta);
            return;
        }

        try {
            Intent intent = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName())
            );

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject resposta = new JSObject();
            resposta.put("aberto", true);
            call.resolve(resposta);
        } catch (Exception erro) {
            call.reject(
                    "Não foi possível abrir a permissão para instalar atualizações.",
                    erro
            );
        }
    }

    @PluginMethod
    public void baixarEInstalar(PluginCall call) {
        String apkUrl = call.getString("apkUrl");
        String nomeArquivo = call.getString(
                "nomeArquivo",
                "express-manager-atualizacao.apk"
        );

        if (apkUrl == null || apkUrl.trim().isEmpty()) {
            call.reject("Endereço do APK não informado.");
            return;
        }

        if (
                !apkUrl.startsWith("https://")
                        && !apkUrl.startsWith("http://")
        ) {
            call.reject("Endereço do APK inválido.");
            return;
        }

        String nomeSeguro = sanitizarNomeArquivo(nomeArquivo);

        if (!nomeSeguro.toLowerCase().endsWith(".apk")) {
            nomeSeguro += ".apk";
        }

        try {
            File pastaAtualizacoes = new File(
                    getContext().getExternalFilesDir(
                            Environment.DIRECTORY_DOWNLOADS
                    ),
                    "atualizacoes"
            );

            if (
                    !pastaAtualizacoes.exists()
                            && !pastaAtualizacoes.mkdirs()
            ) {
                call.reject("Não foi possível preparar a pasta da atualização.");
                return;
            }

            File arquivoDestino = new File(
                    pastaAtualizacoes,
                    nomeSeguro
            );

            if (arquivoDestino.exists()) {
                arquivoDestino.delete();
            }

            DownloadManager.Request requisicao =
                    new DownloadManager.Request(
                            Uri.parse(apkUrl)
                    );

            requisicao.setTitle("Atualizando Express Manager");
            requisicao.setDescription("Baixando nova versão do aplicativo.");
            requisicao.setNotificationVisibility(
                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
            );
            requisicao.setAllowedOverMetered(true);
            requisicao.setAllowedOverRoaming(false);
            requisicao.setDestinationUri(
                    Uri.fromFile(arquivoDestino)
            );

            DownloadManager gerenciador =
                    (DownloadManager) getContext().getSystemService(
                            Context.DOWNLOAD_SERVICE
                    );

            if (gerenciador == null) {
                call.reject("Gerenciador de downloads indisponível.");
                return;
            }

            long downloadId = gerenciador.enqueue(requisicao);

            executor.execute(() ->
                    acompanharDownload(
                            call,
                            gerenciador,
                            downloadId,
                            arquivoDestino
                    )
            );
        } catch (Exception erro) {
            call.reject(
                    "Não foi possível iniciar o download da atualização.",
                    erro
            );
        }
    }

    private void acompanharDownload(
            PluginCall call,
            DownloadManager gerenciador,
            long downloadId,
            File arquivoDestino
    ) {
        DownloadManager.Query consulta =
                new DownloadManager.Query().setFilterById(downloadId);

        try {
            while (true) {
                try (
                        android.database.Cursor cursor =
                                gerenciador.query(consulta)
                ) {
                    if (
                            cursor == null
                                    || !cursor.moveToFirst()
                    ) {
                        call.reject("O download da atualização não foi encontrado.");
                        return;
                    }

                    int indiceStatus =
                            cursor.getColumnIndex(
                                    DownloadManager.COLUMN_STATUS
                            );

                    int status = cursor.getInt(indiceStatus);

                    if (status == DownloadManager.STATUS_SUCCESSFUL) {
                        getActivity().runOnUiThread(() -> {
                            try {
                                abrirInstalador(arquivoDestino);

                                JSObject resposta = new JSObject();
                                resposta.put("baixado", true);
                                resposta.put("instaladorAberto", true);
                                call.resolve(resposta);
                            } catch (Exception erro) {
                                call.reject(
                                        "O APK foi baixado, mas não foi possível abrir o instalador.",
                                        erro
                                );
                            }
                        });

                        return;
                    }

                    if (status == DownloadManager.STATUS_FAILED) {
                        int indiceMotivo =
                                cursor.getColumnIndex(
                                        DownloadManager.COLUMN_REASON
                                );

                        int motivo = cursor.getInt(indiceMotivo);

                        call.reject(
                                "Falha ao baixar a atualização. Código: "
                                        + motivo
                        );
                        return;
                    }
                }

                Thread.sleep(1000L);
            }
        } catch (InterruptedException erro) {
            Thread.currentThread().interrupt();
            call.reject("Download da atualização interrompido.", erro);
        } catch (Exception erro) {
            call.reject(
                    "Erro ao acompanhar o download da atualização.",
                    erro
            );
        }
    }

    private void abrirInstalador(File arquivoApk) {
        Uri uriApk = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                arquivoApk
        );

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(
                uriApk,
                "application/vnd.android.package-archive"
        );
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

        getContext().startActivity(intent);
    }

    private String sanitizarNomeArquivo(String nomeArquivo) {
        String limpo =
                nomeArquivo == null
                        ? "express-manager-atualizacao.apk"
                        : nomeArquivo.trim();

        limpo = limpo.replaceAll("[^a-zA-Z0-9._-]", "-");

        if (limpo.isEmpty()) {
            return "express-manager-atualizacao.apk";
        }

        return limpo;
    }

    @Override
    protected void handleOnDestroy() {
        executor.shutdownNow();
        super.handleOnDestroy();
    }
}
