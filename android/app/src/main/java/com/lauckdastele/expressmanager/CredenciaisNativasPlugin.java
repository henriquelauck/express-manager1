package com.lauckdastele.expressmanager;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "CredenciaisNativas")
public class CredenciaisNativasPlugin extends Plugin {

    private static final String PREFERENCIAS = "express_manager_seguro";
    private static final String CHAVE_TOKEN = "motoboy_app_token";

    @PluginMethod
    public void salvarToken(PluginCall call) {
        String token = call.getString("token");

        if (token == null || token.trim().isEmpty()) {
            call.reject("Token não informado.");
            return;
        }

        try {
            SharedPreferences preferencias = getContext().getSharedPreferences(
                    PREFERENCIAS,
                    Context.MODE_PRIVATE
            );

            preferencias
                    .edit()
                    .putString(CHAVE_TOKEN, token)
                    .apply();

            JSObject resposta = new JSObject();
            resposta.put("salvo", true);

            call.resolve(resposta);
        } catch (Exception erro) {
            call.reject("Não foi possível armazenar o token do aplicativo.", erro);
        }
    }

    @PluginMethod
    public void removerToken(PluginCall call) {
        try {
            SharedPreferences preferencias = getContext().getSharedPreferences(
                    PREFERENCIAS,
                    Context.MODE_PRIVATE
            );

            preferencias
                    .edit()
                    .remove(CHAVE_TOKEN)
                    .apply();

            JSObject resposta = new JSObject();
            resposta.put("removido", true);

            call.resolve(resposta);
        } catch (Exception erro) {
            call.reject("Não foi possível remover o token do aplicativo.", erro);
        }
    }
}