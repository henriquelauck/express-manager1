package com.lauckdastele.expressmanager;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

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
                        alias = "notificacoes",
                        strings = {
                                Manifest.permission.POST_NOTIFICATIONS
                        }
                )
        }
)
public class LocalizacaoPlugin extends Plugin {

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

        solicitarNotificacaoOuIniciar(call);
    }

    @PermissionCallback
    private void permissaoLocalizacaoConcedida(PluginCall call) {
        if (!temPermissaoLocalizacao()) {
            call.reject("Permissão de localização não concedida.");
            return;
        }

        solicitarNotificacaoOuIniciar(call);
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