FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["TalentPulseApi.csproj", "./"]
RUN dotnet restore "TalentPulseApi.csproj"
COPY . .
RUN dotnet publish "TalentPulseApi.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV DOTNET_hostBuilder__reloadConfigOnChange=false
ENV DOTNET_USE_POLLING_FILE_WATCHER=false
EXPOSE 8080
ENTRYPOINT dotnet TalentPulseApi.dll --urls "http://+:${PORT:-8080}"
