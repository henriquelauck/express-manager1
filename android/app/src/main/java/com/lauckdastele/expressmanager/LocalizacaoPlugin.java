package com.lauckdastele.expressmanager;

import android.Manifest;
import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
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

    private static final String PREFERENCIAS = "express_manager_seguro";
    private static final String CHAVE_MOTOBOY_ONLINE = "motoboy_online";

    @PluginMethod
    public void verificarPermissoes(PluginCall call) {
        boolean localizacaoDuranteUso = temPermissaoLocalizacao();
        boolean localizacaoSegundoPlano = temPermissaoSegundoPlano();
        boolean notificacoes = temPermissaoNotificacoes();
        boolean bateriaSemRestricao = bateriaSemRestricao();
        boolean gpsAtivo = gpsAtivo();
        boolean servicoAtivo = servicoLocalizacaoAtivo();

        JSObject resposta = new JSObject();

        resposta.put("localizacaoDuranteUso", localizacaoDuranteUso);
        resposta.put("localizacaoSegundoPlano", localizacaoSegundoPlano);
        resposta.put("notificacoes", notificacoes);
        resposta.put("bateriaSemRestricao", bateriaSemRestricao);
        resposta.put("gpsAtivo", gpsAtivo);
        resposta.put("servicoAtivo", servicoAtivo);

        /*
         * Permissões e configurações obrigatórias para permitir
         * que o motoboy fique online com segurança.
         *
         * O serviço ainda não precisa estar ativo nesta verificação,
         * pois ele será iniciado ao tocar em "Ficar online".
         */
        resposta.put(
                "prontoParaFicarOnline",
                localizacaoDuranteUso
                        && localizacaoSegundoPlano
                        && notificacoes
                        && bateriaSemRestricao
                        && gpsAtivo
        );

        resposta.put(
                "precisaAbrirConfiguracoes",
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                        && !localizacaoSegundoPlano
        );

        resposta.put(
                "precisaCorrigirBateria",
                !bateriaSemRestricao
        );

        resposta.put(
                "precisaAtivarGps",
                !gpsAtivo
        );

        call.resolve(resposta);
    }

    @PluginMethod
    public void abrirConfiguracoesLocalizacao(PluginCall call) {
        abrirDetalhesDoAplicativo(
                call,
                "Não foi possível abrir as configurações de localização."
        );
    }

    @PluginMethod
    public void abrirConfiguracoesBateria(PluginCall call) {
        try {
            Intent intent = new Intent();

            /*
             * Abre diretamente a configuração de otimização do próprio app
             * quando o Android oferece suporte. Caso o fabricante bloqueie
             * esse atalho, usamos a lista geral de otimização de bateria.
             */
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            } else {
                intent.setAction(Settings.ACTION_SETTINGS);
            }

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject resposta = new JSObject();
            resposta.put("aberto", true);
            call.resolve(resposta);
        } catch (Exception primeiroErro) {
            try {
                Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);

                JSObject resposta = new JSObject();
                resposta.put("aberto", true);
                resposta.put("fallback", true);
                call.resolve(resposta);
            } catch (Exception segundoErro) {
                call.reject(
                        "Não foi possível abrir as configurações de bateria.",
                        segundoErro
                );
            }
        }
    }

    @PluginMethod
    public void abrirConfiguracoesGps(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject resposta = new JSObject();
            resposta.put("aberto", true);
            call.resolve(resposta);
        } catch (Exception erro) {
            call.reject(
                    "Não foi possível abrir as configurações de GPS.",
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

        validarConfiguracoesEIniciar(call);
    }

    @PermissionCallback
    private void permissaoNotificacaoConcedida(PluginCall call) {
        if (!temPermissaoNotificacoes()) {
            call.reject("Permissão de notificações não concedida.");
            return;
        }

        validarConfiguracoesEIniciar(call);
    }

    private void validarConfiguracoesEIniciar(PluginCall call) {
        if (!gpsAtivo()) {
            call.reject(
                    "Ative o GPS do aparelho antes de ficar online."
            );
            return;
        }

        if (!bateriaSemRestricao()) {
            call.reject(
                    "Desative a otimização de bateria do Express Manager antes de ficar online."
            );
            return;
        }

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

    private boolean bateriaSemRestricao() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return true;
        }

        PowerManager powerManager =
                (PowerManager) getContext().getSystemService(
                        Context.POWER_SERVICE
                );

        if (powerManager == null) {
            return false;
        }

        return powerManager.isIgnoringBatteryOptimizations(
                getContext().getPackageName()
        );
    }

    private boolean gpsAtivo() {
        LocationManager locationManager =
                (LocationManager) getContext().getSystemService(
                        Context.LOCATION_SERVICE
                );

        if (locationManager == null) {
            return false;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            return locationManager.isLocationEnabled();
        }

        try {
            return locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
                    || locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        } catch (Exception erro) {
            return false;
        }
    }

    @SuppressWarnings("deprecation")
    private boolean servicoLocalizacaoAtivo() {
        ActivityManager activityManager =
                (ActivityManager) getContext().getSystemService(
                        Context.ACTIVITY_SERVICE
                );

        if (activityManager == null) {
            return false;
        }

        for (ActivityManager.RunningServiceInfo servico :
                activityManager.getRunningServices(Integer.MAX_VALUE)) {
            if (
                    LocalizacaoService.class.getName().equals(
                            servico.service.getClassName()
                    )
            ) {
                return true;
            }
        }

        return false;
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

            getContext()
                    .getSharedPreferences(
                            PREFERENCIAS,
                            Context.MODE_PRIVATE
                    )
                    .edit()
                    .putBoolean(
                            CHAVE_MOTOBOY_ONLINE,
                            true
                    )
                    .apply();

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

            getContext().startService(intent);

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

            getContext()
                    .getSharedPreferences(
                            PREFERENCIAS,
                            Context.MODE_PRIVATE
                    )
                    .edit()
                    .putBoolean(
                            CHAVE_MOTOBOY_ONLINE,
                            false
                    )
                    .apply();

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

    private void abrirDetalhesDoAplicativo(
            PluginCall call,
            String mensagemErro
    ) {
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
                    mensagemErro,
                    erro
            );
        }
    }
}
