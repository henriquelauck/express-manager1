package com.lauckdastele.expressmanager;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
        name = "LocalizacaoNativa",
        permissions = {
                @Permission(
                        alias = "localizacao",
                        strings = {
                                Manifest.permission.ACCESS_COARSE_LOCATION,
                                Manifest.permission.ACCESS_FINE_LOCATION
                        }
                ),
                @Permission(
                        alias = "localizacaoSegundoPlano",
                        strings = {
                                Manifest.permission.ACCESS_BACKGROUND_LOCATION
                        }
                ),
                @Permission(
                        alias = "notificacoes",
                        strings = {
                                Manifest.permission.POST_NOTIFICATIONS
                        }
                )
        }
)
public class LocalizacaoPlugin extends Plugin {

    @PluginMethod
    public void verificarPermissoes(PluginCall call) {
        JSObject resposta = new JSObject();

        resposta.put(
                "localizacaoDuranteUso",
                temPermissaoLocalizacao()
        );

        resposta.put(
                "localizacaoSegundoPlano",
                temPermissaoSegundoPlano()
        );

        resposta.put(
                "notificacoes",
                temPermissaoNotificacoes()
        );

        resposta.put(
                "prontoParaFicarOnline",
                temPermissaoLocalizacao()
                        && temPermissaoSegundoPlano()
                        && temPermissaoNotificacoes()
        );

        resposta.put(
                "precisaAbrirConfiguracoes",
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                        && !temPermissaoSegundoPlano()
        );

        call.resolve(resposta);
    }

    @PluginMethod
    public void abrirConfiguracoesLocalizacao(PluginCall call) {
        try {
            Intent intent = new Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS
            );

            intent.setData(
                    Uri.parse("package:" + getContext().getPackageName())
            );

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            getContext().startActivity(intent);

            JSObject resposta = new JSObject();
            resposta.put("aberto", true);

            call.resolve(resposta);
        } catch (Exception erro) {
            call.reject(
                    "Não foi possível abrir as configurações de localização.",
                    erro
            );
        }
    }

    @PluginMethod
    public void iniciar(PluginCall call) {
        if (!temPermissaoLocalizacao()) {
            requestPermissionForAlias(
                    "localizacao",
                    call,
                    "permissaoLocalizacaoConcedida"
            );
            return;
        }

        solicitarSegundoPlanoOuContinuar(call);
    }

    @PermissionCallback
    private void permissaoLocalizacaoConcedida(PluginCall call) {
        if (!temPermissaoLocalizacao()) {
            call.reject("Permissão de localização não concedida.");
            return;
        }

        solicitarSegundoPlanoOuContinuar(call);
    }

    private void solicitarSegundoPlanoOuContinuar(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            solicitarNotificacaoOuIniciar(call);
            return;
        }

        if (temPermissaoSegundoPlano()) {
            solicitarNotificacaoOuIniciar(call);
            return;
        }

        if (Build.VERSION.SDK_INT == Build.VERSION_CODES.Q) {
            requestPermissionForAlias(
                    "localizacaoSegundoPlano",
                    call,
                    "permissaoSegundoPlanoConcedida"
            );
            return;
        }

        abrirConfiguracoesParaSegundoPlano(call);
    }

    @PermissionCallback
    private void permissaoSegundoPlanoConcedida(PluginCall call) {
        if (!temPermissaoSegundoPlano()) {
            call.reject(
                    "Permissão para localização em segundo plano não concedida."
            );
            return;
        }

        solicitarNotificacaoOuIniciar(call);
    }

    private void abrirConfiguracoesParaSegundoPlano(PluginCall call) {
        try {
            Intent intent = new Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS
            );

            intent.setData(
                    Uri.parse("package:" + getContext().getPackageName())
            );

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            getContext().startActivity(intent);

            call.reject(
                    "Ative Permissões > Localização > Permitir o tempo todo e depois toque em Ficar online novamente."
            );
        } catch (Exception erro) {
            call.reject(
                    "Não foi possível abrir as configurações de localização.",
                    erro
            );
        }
    }

    private void solicitarNotificacaoOuIniciar(PluginCall call) {
        if (
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                        && ContextCompat.checkSelfPermission(
                                getContext(),
                                Manifest.permission.POST_NOTIFICATIONS
                        ) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissionForAlias(
                    "notificacoes",
                    call,
                    "permissaoNotificacaoConcedida"
            );
            return;
        }

        iniciarServico(call);
    }

    @PermissionCallback
    private void permissaoNotificacaoConcedida(PluginCall call) {
        iniciarServico(call);
    }

    private boolean temPermissaoLocalizacao() {
        boolean precisa =
                ContextCompat.checkSelfPermission(
                        getContext(),
                        Manifest.permission.ACCESS_FINE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED;

        boolean aproximada =
                ContextCompat.checkSelfPermission(
                        getContext(),
                        Manifest.permission.ACCESS_COARSE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED;

        return precisa || aproximada;
    }

    private boolean temPermissaoSegundoPlano() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return true;
        }

        return ContextCompat.checkSelfPermission(
                getContext(),
                Manifest.permission.ACCESS_BACKGROUND_LOCATION
        ) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean temPermissaoNotificacoes() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return true;
        }

        return ContextCompat.checkSelfPermission(
                getContext(),
                Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED;
    }

    private void iniciarServico(PluginCall call) {
        try {
            Intent intent = new Intent(
                    getContext(),
                    LocalizacaoService.class
            );

            ContextCompat.startForegroundService(
                    getContext(),
                    intent
            );

            JSObject resposta = new JSObject();
            resposta.put("ativo", true);

            call.resolve(resposta);
        } catch (Exception erro) {
            call.reject(
                    "Não foi possível iniciar o serviço de localização.",
                    erro
            );
        }
    }

    @PluginMethod
    public void pararSomAlerta(PluginCall call) {
        try {
            Intent intent = new Intent(
                    getContext(),
                    LocalizacaoService.class
            );

            intent.setAction(
                    LocalizacaoService.ACAO_PARAR_SOM
            );

            ContextCompat.startForegroundService(
                    getContext(),
                    intent
            );

            JSObject resposta = new JSObject();
            resposta.put("parado", true);

            call.resolve(resposta);
        } catch (Exception erro) {
            call.reject(
                    "Não foi possível parar o som do alerta.",
                    erro
            );
        }
    }

    @PluginMethod
    public void parar(PluginCall call) {
        try {
            Intent intent = new Intent(
                    getContext(),
                    LocalizacaoService.class
            );

            boolean parou = getContext().stopService(intent);

            JSObject resposta = new JSObject();
            resposta.put("ativo", false);
            resposta.put("servicoEncontrado", parou);

            call.resolve(resposta);
        } catch (Exception erro) {
            call.reject(
                    "Não foi possível encerrar o serviço de localização.",
                    erro
            );
        }
    }
}