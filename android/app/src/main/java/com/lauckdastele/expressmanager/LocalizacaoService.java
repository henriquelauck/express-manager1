package com.lauckdastele.expressmanager;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class LocalizacaoService extends Service {

    private static final String TAG = "ExpressLocalizacao";
    private static final String CANAL_ID = "express_localizacao";
    private static final int NOTIFICACAO_ID = 1001;

    private static final String PREFERENCIAS = "express_manager_seguro";
    private static final String CHAVE_TOKEN = "motoboy_app_token";

    private static final String URL_LOCALIZACAO =
            "https://express-manager1.vercel.app/api/motoboys/minha-localizacao";

    private FusedLocationProviderClient clienteLocalizacao;
    private LocationCallback callbackLocalizacao;
    private ExecutorService executorRede;

    @Override
    public void onCreate() {
        super.onCreate();

        criarCanalNotificacao();

        executorRede = Executors.newSingleThreadExecutor();

        clienteLocalizacao =
                LocationServices.getFusedLocationProviderClient(this);

        callbackLocalizacao = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult resultado) {
                if (resultado == null) {
                    return;
                }

                Location localizacao = resultado.getLastLocation();

                if (localizacao == null) {
                    return;
                }

                Log.d(
                        TAG,
                        "Latitude: " + localizacao.getLatitude()
                                + " | Longitude: " + localizacao.getLongitude()
                                + " | Precisão: " + localizacao.getAccuracy() + " m"
                );

                enviarLocalizacaoParaServidor(localizacao);
            }
        };
    }

    @Override
    public int onStartCommand(
            Intent intent,
            int flags,
            int startId
    ) {
        iniciarComoServicoEmPrimeiroPlano();
        iniciarAtualizacoesLocalizacao();

        return START_STICKY;
    }

    private void iniciarComoServicoEmPrimeiroPlano() {
        Intent abrirAplicativo = new Intent(this, MainActivity.class);

        abrirAplicativo.setFlags(
                Intent.FLAG_ACTIVITY_SINGLE_TOP
                        | Intent.FLAG_ACTIVITY_CLEAR_TOP
        );

        int flagsPendingIntent = PendingIntent.FLAG_UPDATE_CURRENT;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flagsPendingIntent |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                abrirAplicativo,
                flagsPendingIntent
        );

        NotificationCompat.Builder notificacao =
                new NotificationCompat.Builder(this, CANAL_ID)
                        .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                        .setContentTitle("Express Manager")
                        .setContentText(
                                "Você está online e compartilhando sua localização."
                        )
                        .setContentIntent(pendingIntent)
                        .setOngoing(true)
                        .setOnlyAlertOnce(true)
                        .setPriority(NotificationCompat.PRIORITY_LOW)
                        .setCategory(NotificationCompat.CATEGORY_SERVICE);

        startForeground(
                NOTIFICACAO_ID,
                notificacao.build()
        );
    }

    private void iniciarAtualizacoesLocalizacao() {
        boolean permissaoPrecisa =
                ActivityCompat.checkSelfPermission(
                        this,
                        Manifest.permission.ACCESS_FINE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED;

        boolean permissaoAproximada =
                ActivityCompat.checkSelfPermission(
                        this,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED;

        if (!permissaoPrecisa && !permissaoAproximada) {
            Log.e(
                    TAG,
                    "Serviço encerrado: permissão de localização não concedida."
            );

            stopSelf();
            return;
        }

        LocationRequest requisicao =
                new LocationRequest.Builder(
                        Priority.PRIORITY_HIGH_ACCURACY,
                        15000L
                )
                        .setMinUpdateIntervalMillis(10000L)
                        .setMinUpdateDistanceMeters(25f)
                        .build();

        clienteLocalizacao.requestLocationUpdates(
                requisicao,
                callbackLocalizacao,
                getMainLooper()
        );
    }

    private String obterToken() {
        SharedPreferences preferencias =
                getSharedPreferences(
                        PREFERENCIAS,
                        Context.MODE_PRIVATE
                );

        return preferencias.getString(CHAVE_TOKEN, null);
    }

    private void enviarLocalizacaoParaServidor(Location localizacao) {
        if (executorRede == null || executorRede.isShutdown()) {
            return;
        }

        final double latitude = localizacao.getLatitude();
        final double longitude = localizacao.getLongitude();
        final float precisao = localizacao.getAccuracy();

        executorRede.execute(() -> {
            String token = obterToken();

            if (token == null || token.trim().isEmpty()) {
                Log.e(
                        TAG,
                        "Localização não enviada: token do aplicativo não encontrado."
                );
                return;
            }

            try {
                int status = enviarRequisicao(
                        token,
                        "ATUALIZAR",
                        latitude,
                        longitude,
                        precisao
                );

                if (status == 409) {
                    status = enviarRequisicao(
                            token,
                            "ONLINE",
                            latitude,
                            longitude,
                            precisao
                    );
                }

                if (status >= 200 && status < 300) {
                    Log.d(
                            TAG,
                            "Localização enviada ao servidor com sucesso."
                    );
                } else {
                    Log.e(
                            TAG,
                            "Servidor recusou a localização. HTTP " + status
                    );
                }
            } catch (Exception erro) {
                Log.e(
                        TAG,
                        "Erro ao enviar localização ao servidor.",
                        erro
                );
            }
        });
    }

    private int enviarRequisicao(
            String token,
            String acao,
            double latitude,
            double longitude,
            float precisao
    ) throws Exception {
        HttpURLConnection conexao = null;

        try {
            URL url = new URL(URL_LOCALIZACAO);

            conexao = (HttpURLConnection) url.openConnection();
            conexao.setRequestMethod("PUT");
            conexao.setConnectTimeout(15000);
            conexao.setReadTimeout(15000);
            conexao.setDoOutput(true);
            conexao.setRequestProperty(
                    "Content-Type",
                    "application/json; charset=UTF-8"
            );
            conexao.setRequestProperty(
                    "Accept",
                    "application/json"
            );
            conexao.setRequestProperty(
                    "Authorization",
                    "Bearer " + token
            );

            JSONObject corpo = new JSONObject();
            corpo.put("acao", acao);
            corpo.put("latitude", latitude);
            corpo.put("longitude", longitude);
            corpo.put("precisao", precisao);

            byte[] dados =
                    corpo.toString().getBytes(StandardCharsets.UTF_8);

            conexao.setFixedLengthStreamingMode(dados.length);

            try (OutputStream saida = conexao.getOutputStream()) {
                saida.write(dados);
                saida.flush();
            }

            int status = conexao.getResponseCode();

            InputStream fluxo =
                    status >= 200 && status < 400
                            ? conexao.getInputStream()
                            : conexao.getErrorStream();

            String resposta = lerResposta(fluxo);

            Log.d(
                    TAG,
                    "Resposta da API (" + status + "): " + resposta
            );

            return status;
        } finally {
            if (conexao != null) {
                conexao.disconnect();
            }
        }
    }

    private String lerResposta(InputStream fluxo) {
        if (fluxo == null) {
            return "";
        }

        try (
                BufferedReader leitor = new BufferedReader(
                        new InputStreamReader(
                                fluxo,
                                StandardCharsets.UTF_8
                        )
                )
        ) {
            StringBuilder resposta = new StringBuilder();
            String linha;

            while ((linha = leitor.readLine()) != null) {
                resposta.append(linha);
            }

            return resposta.toString();
        } catch (Exception erro) {
            Log.e(TAG, "Erro ao ler resposta da API.", erro);
            return "";
        }
    }

    private void criarCanalNotificacao() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationChannel canal = new NotificationChannel(
                CANAL_ID,
                "Localização do motoboy",
                NotificationManager.IMPORTANCE_LOW
        );

        canal.setDescription(
                "Mostra quando o Express Manager está compartilhando a localização."
        );

        NotificationManager gerenciador =
                getSystemService(NotificationManager.class);

        gerenciador.createNotificationChannel(canal);
    }

    @Override
    public void onDestroy() {
        if (
                clienteLocalizacao != null
                        && callbackLocalizacao != null
        ) {
            clienteLocalizacao.removeLocationUpdates(
                    callbackLocalizacao
            );
        }

        if (executorRede != null) {
            executorRede.shutdownNow();
        }

        Log.d(TAG, "Serviço de localização encerrado.");

        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}