package com.lauckdastele.expressmanager;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.core.content.ContextCompat;

public class ReinicioLocalizacaoReceiver extends BroadcastReceiver {

    private static final String TAG = "ExpressReinicio";
    private static final String PREFERENCIAS = "express_manager_seguro";
    private static final String CHAVE_TOKEN = "motoboy_app_token";
    private static final String CHAVE_MOTOBOY_ONLINE = "motoboy_online";

    @Override
    public void onReceive(
            Context context,
            Intent intent
    ) {
        if (context == null || intent == null) {
            return;
        }

        String acao = intent.getAction();

        boolean acaoPermitida =
                Intent.ACTION_BOOT_COMPLETED.equals(acao)
                        || Intent.ACTION_MY_PACKAGE_REPLACED.equals(acao)
                        || "android.intent.action.LOCKED_BOOT_COMPLETED".equals(acao);

        if (!acaoPermitida) {
            return;
        }

        SharedPreferences preferencias =
                context.getSharedPreferences(
                        PREFERENCIAS,
                        Context.MODE_PRIVATE
                );

        boolean motoboyEstavaOnline =
                preferencias.getBoolean(
                        CHAVE_MOTOBOY_ONLINE,
                        false
                );

        String token =
                preferencias.getString(
                        CHAVE_TOKEN,
                        null
                );

        if (!motoboyEstavaOnline) {
            Log.d(
                    TAG,
                    "Serviço não reiniciado: motoboy estava offline."
            );
            return;
        }

        if (token == null || token.trim().isEmpty()) {
            Log.w(
                    TAG,
                    "Serviço não reiniciado: token do motoboy não encontrado."
            );

            preferencias
                    .edit()
                    .putBoolean(
                            CHAVE_MOTOBOY_ONLINE,
                            false
                    )
                    .apply();

            return;
        }

        try {
            Intent servico =
                    new Intent(
                            context,
                            LocalizacaoService.class
                    );

            ContextCompat.startForegroundService(
                    context,
                    servico
            );

            Log.d(
                    TAG,
                    "Serviço de localização reiniciado após inicialização ou atualização."
            );
        } catch (Exception erro) {
            Log.e(
                    TAG,
                    "Não foi possível reiniciar o serviço de localização.",
                    erro
            );
        }
    }
}
